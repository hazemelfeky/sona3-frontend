// =============================================================================
// Edge Function: send-push
// Paste this whole file into Supabase Dashboard → Edge Functions → send-push
// → Code, then Deploy. Single file, no other files needed.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY   — same value as VITE_VAPID_PUBLIC_KEY in the frontend
//   VAPID_PRIVATE_KEY  — private half of the same pair (never in the frontend)
//   VAPID_SUBJECT      — "mailto:you@example.com" (or an https:// URL)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase — don't add them.
//
// Request body (JSON):
//   { "title": "...", "body": "...", "user_id": "<uuid>" }        ← main case
//   { "title": "...", "body": "...", "user_ids": ["<uuid>", ...] } ← optional
//   { "title": "...", "body": "...", "all": true }                 ← optional
//   optional extras: "url" (opened on click, default "/"), "tag"
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// ---------------------------------------------------------------------------
// WHO COUNTS AS ADMIN
// This app has no role column: access is permission codes returned by the
// `my_perms()` RPC (which already returns nothing for non-approved accounts).
// A caller is allowed if they hold ANY of these codes. Adjust if needed.
// ---------------------------------------------------------------------------
const ADMIN_PERMS = ['notifications.send']

const MAX_TITLE = 120
const MAX_BODY = 1000
const MAX_USER_IDS = 500

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'SERVER_MISCONFIGURED', message: 'Supabase env vars missing' })
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return json(500, { error: 'SERVER_MISCONFIGURED', message: 'VAPID secrets missing' })
  }

  // ---- 1) Authenticate the caller from their own JWT ------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { error: 'UNAUTHENTICATED' })

  // Client that acts AS the caller, so RLS and my_perms() see their identity.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // getUser() validates the token with Supabase Auth (signature + expiry +
  // not signed out) — a bare anon key or forged JWT fails here.
  const { data: userData, error: userError } = await callerClient.auth.getUser(token)
  if (userError || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' })

  // ---- 2) Authorize: caller must be an admin (see ADMIN_PERMS) --------------
  const { data: perms, error: permsError } = await callerClient.rpc('my_perms')
  if (permsError) return json(500, { error: 'PERMS_CHECK_FAILED', message: permsError.message })
  const callerPerms = Array.isArray(perms) ? (perms as string[]) : []
  if (!ADMIN_PERMS.some((code) => callerPerms.includes(code))) {
    return json(403, { error: 'NO_PERMISSION' })
  }

  // ---- 3) Validate input -----------------------------------------------------
  let input: Record<string, unknown>
  try {
    input = await req.json()
  } catch {
    return json(400, { error: 'INVALID_JSON' })
  }

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const body = typeof input.body === 'string' ? input.body.trim() : ''
  const url = typeof input.url === 'string' && input.url.startsWith('/') ? input.url : '/'
  const tag = typeof input.tag === 'string' ? input.tag.slice(0, 64) : undefined

  if (!title || title.length > MAX_TITLE) return json(400, { error: 'INVALID_TITLE' })
  if (!body || body.length > MAX_BODY) return json(400, { error: 'INVALID_BODY' })

  const sendToAll = input.all === true
  let userIds: string[] = []
  if (typeof input.user_id === 'string') userIds.push(input.user_id)
  if (Array.isArray(input.user_ids)) {
    userIds.push(...input.user_ids.filter((v): v is string => typeof v === 'string'))
  }
  userIds = [...new Set(userIds)]

  if (!sendToAll) {
    if (userIds.length === 0) return json(400, { error: 'TARGET_REQUIRED' })
    if (userIds.length > MAX_USER_IDS) return json(400, { error: 'TOO_MANY_USERS' })
    if (!userIds.every((id) => UUID_RE.test(id))) return json(400, { error: 'INVALID_USER_ID' })
  }

  // ---- 4) Load subscriptions (service role → bypasses RLS, server-side only) --
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let query = adminClient.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  if (!sendToAll) query = query.in('user_id', userIds)
  const { data: subs, error: subsError } = await query
  if (subsError) return json(500, { error: 'LOAD_SUBSCRIPTIONS_FAILED', message: subsError.message })

  const subscriptions = (subs ?? []) as SubscriptionRow[]
  const usersWithSubscription = new Set(subscriptions.map((s) => s.user_id))

  // ---- 5) Send ---------------------------------------------------------------
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  // Must match what src/sw.js reads in its "push" listener.
  const payload = JSON.stringify({ title, body, url, tag })

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []
  const errors: { status: number | null; message: string }[] = []

  const BATCH = 50
  for (let i = 0; i < subscriptions.length; i += BATCH) {
    const batch = subscriptions.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'high' },
        ),
      ),
    )

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        sent++
        return
      }
      failed++
      const err = result.reason as { statusCode?: number; body?: string; message?: string }
      const status = typeof err?.statusCode === 'number' ? err.statusCode : null
      // 404 / 410 = subscription is gone for good (user revoked, app removed…).
      if (status === 404 || status === 410) expiredIds.push(batch[idx]!.id)
      else if (errors.length < 10) errors.push({ status, message: err?.body || err?.message || 'unknown' })
    })
  }

  let removed = 0
  if (expiredIds.length) {
    const { error: delError, count } = await adminClient
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .in('id', expiredIds)
    if (!delError) removed = count ?? expiredIds.length
  }

  // ---- 6) Summary ------------------------------------------------------------
  return json(200, {
    ok: true,
    target: sendToAll ? 'all' : userIds.length === 1 ? 'user' : 'users',
    targeted_users: sendToAll ? usersWithSubscription.size : userIds.length,
    users_without_subscription: sendToAll
      ? 0
      : userIds.filter((id) => !usersWithSubscription.has(id)).length,
    subscriptions: subscriptions.length,
    sent,
    failed,
    removed_expired: removed,
    errors,
  })
})
