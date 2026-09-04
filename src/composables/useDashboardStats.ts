import { ref } from 'vue'
import { db, warnIfEmptyFromRls } from '@/lib/supabase'
import { toUserMessage } from '@/utils/errors'

export function useDashboardStats(source: string) {
  const stats = ref<Record<string, unknown> | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db.from(source).select('*').maybeSingle()
      if (err) throw err
      stats.value = data as Record<string, unknown> | null
      warnIfEmptyFromRls(source, stats.value === null, false)
    } catch (e) {
      error.value = toUserMessage(e, 'حدث خطأ غير متوقع أثناء تحميل الإحصائيات')
      stats.value = null
    } finally {
      loading.value = false
    }
  }

  fetchStats()

  return { stats, loading, error, refresh: fetchStats }
}
