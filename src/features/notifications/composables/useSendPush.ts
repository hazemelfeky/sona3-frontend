import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { db, supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'
import { toUserMessage } from '@/utils/errors'

export interface SendPushSummary {
  ok: boolean
  target: 'user' | 'users' | 'all'
  targeted_users: number
  users_without_subscription: number
  subscriptions: number
  sent: number
  failed: number
  removed_expired: number
  errors: { status: number | null; message: string }[]
}

export interface SendPushPayload {
  title: string
  body: string
  user_id?: string
  user_ids?: string[]
  all?: boolean
  url?: string
}

type DirectoryRow = Database['public']['Views']['v_user_directory']['Row']
export interface UserOption {
  user_id: string
  label: string
  username: string | null
}

export function useUserOptions() {
  const options = ref<UserOption[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('v_user_directory')
        .select('user_id, full_name, username')
        .order('full_name')
      if (err) throw err
      options.value = ((data ?? []) as DirectoryRow[]).map((r) => ({
        user_id: r.user_id,
        label: r.full_name || r.username || '—',
        username: r.username,
      }))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المستخدمين')
      options.value = []
    } finally {
      loading.value = false
    }
  }

  void load()
  return { options, loading, error, refresh: load }
}

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'انتهت الجلسة، سجّل دخول تاني',
  NO_PERMISSION: 'مش معاك صلاحية إرسال الإشعارات',
  INVALID_TITLE: 'العنوان مطلوب (بحد أقصى 120 حرف)',
  INVALID_BODY: 'نص الرسالة مطلوب (بحد أقصى 1000 حرف)',
  TARGET_REQUIRED: 'اختار مستخدم',
  INVALID_USER_ID: 'المستخدم المختار غير صالح',
  SERVER_MISCONFIGURED: 'إعدادات الإشعارات على السيرفر ناقصة (VAPID secrets)',
}

async function readFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string; message?: string }
      if (payload.error && ERROR_MESSAGES[payload.error]) return ERROR_MESSAGES[payload.error]!
      return payload.message || payload.error || 'فشل الإرسال'
    } catch {
      return 'فشل الإرسال'
    }
  }
  return toUserMessage(error, 'فشل الإرسال')
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
      summary.value = data
    } catch (e) {
      error.value = await readFunctionError(e)
    } finally {
      sending.value = false
    }
  }

  return { sending, summary, error, send }
}
