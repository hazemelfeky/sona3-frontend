import { ref } from 'vue'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { db, supabase } from '@/lib/supabase'
import { isOfflineError, OFFLINE_MESSAGE, toUserMessage } from '@/utils/errors'

export interface SendPushSummary {
  ok?: boolean
  sent: number
  failed: number
  subscriptions?: number
  removed_expired?: number
  users_without_subscription?: number
}

export interface SendPushPayload {
  user_id: string
  title: string
  body: string
}

export interface VolunteerOption {
  user_id: string
  label: string
  email: string | null
  username: string
}

// `email` here is the contact email the user typed at signup (optional).
// Never select `auth_email` — that's the placeholder login address.
export function useVolunteerOptions() {
  const options = ref<VolunteerOption[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('profiles')
        .select('user_id, full_name, username, email')
        .eq('status', 'approved')
        .order('full_name')
      if (err) throw err
      const rows = (data ?? []) as { user_id: string; full_name: string | null; username: string; email: string | null }[]
      options.value = rows.map((r) => ({
        user_id: r.user_id,
        label: r.full_name || r.username,
        email: r.email,
        username: r.username,
      }))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المتطوعين')
      options.value = []
    } finally {
      loading.value = false
    }
  }

  void load()
  return { options, loading, error, refresh: load }
}

const FUNCTION_MISSING_MESSAGE = 'خدمة الإرسال (send-push) لسه مش متاحة على السيرفر. جرّب تاني بعد ما تتفعّل.'

const ERROR_CODES: Record<string, string> = {
  UNAUTHENTICATED: 'انتهت الجلسة، سجّل دخول تاني',
  NO_PERMISSION: 'مش معاك صلاحية للإجراء ده',
}

async function translateInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response
    if (res.status === 404) return FUNCTION_MISSING_MESSAGE
    if (res.status === 401) return ERROR_CODES.UNAUTHENTICATED!
    if (res.status === 403) return ERROR_CODES.NO_PERMISSION!
    try {
      const payload = (await res.json()) as { error?: string; message?: string }
      return (payload.error && ERROR_CODES[payload.error]) || payload.message || 'فشل الإرسال. حاول تاني.'
    } catch {
      return 'فشل الإرسال. حاول تاني.'
    }
  }
  // A function that doesn't exist yet answers the browser's CORS preflight
  // with a bare 404, which surfaces as a fetch failure rather than an HTTP
  // error — so when we're actually online, treat it as "not deployed".
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return isOfflineError(error) || navigator.onLine === false ? OFFLINE_MESSAGE : FUNCTION_MISSING_MESSAGE
  }
  return toUserMessage(error, 'فشل الإرسال. حاول تاني.')
}

export function useSendPush() {
  const sending = ref(false)
  const summary = ref<SendPushSummary | null>(null)
  const error = ref<string | null>(null)

  async function send(payload: SendPushPayload) {
    sending.value = true
    summary.value = null
    error.value = null
    try {
      const { data, error: err } = await supabase.functions.invoke<SendPushSummary>('send-push', {
        body: payload,
      })
      if (err) throw err
      summary.value = {
        ...data,
        sent: Number(data?.sent ?? 0),
        failed: Number(data?.failed ?? 0),
      }
    } catch (e) {
      error.value = await translateInvokeError(e)
    } finally {
      sending.value = false
    }
  }

  return { sending, summary, error, send }
}
