import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase, db } from '@/lib/supabase'
import type { Database } from '@/types/db'
import { isOfflineError, OFFLINE_MESSAGE } from '@/utils/errors'

// Deliberately narrower than the profiles.Row type: `auth_email` is the
// throwaway placeholder address (see AUTH_EMAIL_DOMAIN below) and must
// never be selected into app state, so it's excluded at the query level,
// not just left unused.
type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type Profile = Pick<
  ProfileRow,
  'user_id' | 'username' | 'full_name' | 'phone' | 'email' | 'area' | 'status' | 'avatar_path'
>
const PROFILE_COLUMNS = 'user_id, username, full_name, phone, email, area, status, avatar_path'

// Supabase requires an email on every account, so each user gets a
// meaningless placeholder at signup. The user never enters or sees it —
// only `resolve_login` (identifier -> placeholder) and Supabase's own
// session storage ever touch it. Never assign it to app state, display it,
// or log it.
const AUTH_EMAIL_DOMAIN = 'users.gameya.org'

export interface SignUpPayload {
  username: string
  fullName: string
  password: string
  phone?: string
  email?: string
  area?: string
}

function translateSignUpError(error: unknown): string {
  if (isOfflineError(error)) return OFFLINE_MESSAGE
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const code = (error as { code?: string } | null)?.code ?? raw
  if (code.includes('IDENTIFIER_TAKEN')) return 'في بيانات مستخدمة قبل كده. جرّب اسم أو رقم مختلف.'
  if (code.includes('INVALID_USERNAME')) return 'اسم المستخدم غير صالح.'
  return 'حصلت مشكلة. حاول تاني.'
}

// All supabase.auth calls live in this store — nothing else may call them directly.
export const useStore = defineStore('app', () => {
  const profile = ref<Profile | null>(null)
  const userId = ref<string | null>(null)
  const initialized = ref(false)
  const authLoading = ref(false)
  // Permission codes for the signed-in user, loaded once via rpc('my_perms')
  // and kept in the store — never refetched on navigation, only after init,
  // sign-in, or a mutation that could change them.
  const perms = ref<string[]>([])
  const permsSet = computed(() => new Set(perms.value))

  const isAuthenticated = computed(() => userId.value !== null)
  // A signed-in user with no profile row yet (trigger still running) is
  // treated as pending, never as approved.
  const status = computed(() => profile.value?.status ?? (isAuthenticated.value ? 'pending' : null))

  function hasPerm(code: string) {
    return permsSet.value.has(code)
  }

  // A route or nav entry may list several permission codes — holding any one
  // of them is enough. /aid and /stock are the cases that need it: they're for
  // the people who record executions (operations.manage) and the people who
  // only read them (operations.view) alike.
  function hasAnyPerm(codes: string | string[] | undefined) {
    if (!codes) return true
    return (Array.isArray(codes) ? codes : [codes]).some((code) => permsSet.value.has(code))
  }

  async function fetchProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', id)
      .maybeSingle<Profile>()
    if (error && import.meta.env.DEV) console.error('[auth] fetchProfile failed:', error.message)
    profile.value = data
  }

  async function loadPerms() {
    // rpc() fights the typed client's literal-key generics here (same
    // reason lib/supabase.ts keeps the untyped `db` alias).
    const { data, error } = (await db.rpc('my_perms')) as {
      data: string[] | null
      error: { message: string } | null
    }
    if (error && import.meta.env.DEV) console.error('[auth] loadPerms failed:', error.message)
    perms.value = data ?? []
  }

  async function refreshSession(id: string) {
    await fetchProfile(id)
    await loadPerms()
  }

  async function init() {
    if (initialized.value) return
    initialized.value = true

    const {
      data: { session },
    } = await supabase.auth.getSession()
    userId.value = session?.user.id ?? null
    if (userId.value) await refreshSession(userId.value)

    supabase.auth.onAuthStateChange((_event, changedSession) => {
      const nextId = changedSession?.user.id ?? null
      if (nextId === userId.value) return
      userId.value = nextId
      if (nextId) void refreshSession(nextId)
      else {
        profile.value = null
        perms.value = []
      }
    })
  }

  async function signUp(payload: SignUpPayload) {
    authLoading.value = true
    try {
      const authEmail = `${crypto.randomUUID()}@${AUTH_EMAIL_DOMAIN}`
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: payload.password,
        options: {
          data: {
            username: payload.username,
            full_name: payload.fullName,
            phone: payload.phone,
            email: payload.email,
            area: payload.area,
          },
        },
      })
      if (error) throw error
    } catch (error) {
      throw new Error(translateSignUpError(error))
    } finally {
      authLoading.value = false
    }
  }

  async function signIn(identifier: string, password: string) {
    authLoading.value = true
    try {
      // rpc() fights the typed client's literal-key generics here (same
      // reason lib/supabase.ts keeps the untyped `db` alias), so this one
      // call goes through it.
      const { data: authEmail, error: resolveError } = (await db.rpc('resolve_login', { identifier })) as {
        data: string | null
        error: { message: string } | null
      }
      if (resolveError || !authEmail) throw resolveError ?? new Error('resolve_login failed')

      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password })
      if (error || !data.user) throw error ?? new Error('sign in failed')

      userId.value = data.user.id
      await refreshSession(data.user.id)
    } catch {
      // Never distinguish "not found" from "wrong password" — that gap is
      // exactly what would let someone enumerate registered accounts.
      throw new Error('بيانات الدخول غير صحيحة')
    } finally {
      authLoading.value = false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    userId.value = null
    profile.value = null
    perms.value = []
  }

  return {
    profile,
    userId,
    perms,
    isAuthenticated,
    status,
    initialized,
    authLoading,
    hasPerm,
    hasAnyPerm,
    refreshSession,
    init,
    signUp,
    signIn,
    signOut,
  }
})
