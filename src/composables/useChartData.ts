import { ref } from 'vue'
import { db, warnIfEmptyFromRls } from '@/lib/supabase'

export interface ChartRow {
  label: string
  value: number
  series?: string
}

export function useChartData(source: string) {
  const rows = ref<ChartRow[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db.from(source).select('*')
      if (err) throw err
      rows.value = (data as ChartRow[]) ?? []
      warnIfEmptyFromRls(source, rows.value.length === 0, false)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء تحميل الرسم البياني'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  fetchData()

  return { rows, loading, error, refresh: fetchData }
}
