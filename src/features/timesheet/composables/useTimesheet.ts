import { ref, watch, type Ref } from 'vue'
import { db } from '@/lib/supabase'
import { toUserMessage } from '@/utils/errors'

export interface TimesheetEntry {
  id: string | number
  user_id: string
  description: string
  duration_minutes: number
  task_date: string // 'YYYY-MM-DD'
  created_at: string
}

export interface TimesheetEntryPayload {
  description: string
  duration_minutes: number
  task_date: string
}

const ENTRY_COLUMNS = 'id, user_id, description, duration_minutes, task_date, created_at'

export function useTimesheetEntries(userId: Ref<string | null>) {
  const rows = ref<TimesheetEntry[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    if (!userId.value) {
      rows.value = []
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('timesheet_entries')
        .select(ENTRY_COLUMNS)
        .eq('user_id', userId.value)
        .order('task_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (err) throw err
      rows.value = (data ?? []) as TimesheetEntry[]
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المهام')
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch(userId, load, { immediate: true })

  return { rows, loading, error, refresh: load }
}

export async function createEntry(userId: string, payload: TimesheetEntryPayload) {
  const { error } = await db.from('timesheet_entries').insert({ user_id: userId, ...payload })
  if (error) throw new Error('حصلت مشكلة أثناء حفظ المهمة. حاول تاني.')
}

export async function updateEntry(id: string | number, payload: TimesheetEntryPayload) {
  const { error } = await db.from('timesheet_entries').update(payload).eq('id', id)
  if (error) throw new Error('حصلت مشكلة أثناء تعديل المهمة. حاول تاني.')
}

export async function deleteEntry(id: string | number) {
  // Hiding the button is UX only — RLS is the real gate, so a rejected
  // delete still surfaces here rather than failing silently.
  const { error } = await db.from('timesheet_entries').delete().eq('id', id)
  if (error) throw new Error('حصلت مشكلة أثناء مسح المهمة. حاول تاني.')
}
