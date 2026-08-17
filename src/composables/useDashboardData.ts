import { ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { db, warnIfEmptyFromRls } from '@/lib/supabase'
import type { DashboardConfig } from '@/components/list-page/types'

export function useDashboardData(config: DashboardConfig) {
  const rows = ref<Record<string, unknown>[]>([])
  const total = ref(0)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const page = ref(1)
  const pageSize = ref(20)
  const sortKey = ref(config.defaultSort?.key ?? '')
  const sortDir = ref<'asc' | 'desc'>(config.defaultSort?.dir ?? 'asc')
  const search = ref('')
  const filterValues = ref<Record<string, unknown>>({})

  const debouncedSearch = refDebounced(search, 300)

  // Any of these changing means the result set is stale; jump back to page 1.
  watch([filterValues, debouncedSearch, sortKey, sortDir], () => {
    page.value = 1
  }, { deep: true })

  async function fetchRows() {
    loading.value = true
    error.value = null
    try {
      let query = db.from(config.source).select('*', { count: 'exact' })

      if (config.fixedFilter) {
        for (const [key, value] of Object.entries(config.fixedFilter)) {
          query = query.eq(key, value)
        }
      }

      for (const filter of config.filters ?? []) {
        const value = filterValues.value[filter.key]
        if (value === null || value === undefined || value === '') continue

        if (filter.type === 'dateRange') {
          const { from, to } = value as { from?: string; to?: string }
          if (from) query = query.gte(filter.key, from)
          if (to) query = query.lte(filter.key, to)
        } else if (filter.type === 'contains') {
          query = query.ilike(filter.key, `%${value}%`)
        } else {
          query = query.eq(filter.key, value)
        }
      }

      if (debouncedSearch.value && config.search?.length) {
        const orExpr = config.search.map((col) => `${col}.ilike.%${debouncedSearch.value}%`).join(',')
        query = query.or(orExpr)
      }

      if (sortKey.value) {
        query = query.order(sortKey.value, { ascending: sortDir.value === 'asc' })
      }

      const from = (page.value - 1) * pageSize.value
      const to = from + pageSize.value - 1

      const { data, count, error: err } = await query.range(from, to)
      if (err) throw err

      rows.value = (data as Record<string, unknown>[]) ?? []
      total.value = count ?? 0
      warnIfEmptyFromRls(config.source, rows.value.length === 0, false)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء تحميل البيانات'
      rows.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  watch(
    [page, pageSize, filterValues, debouncedSearch, sortKey, sortDir],
    fetchRows,
    { deep: true, immediate: true },
  )

  return {
    rows,
    total,
    loading,
    error,
    page,
    pageSize,
    sortKey,
    sortDir,
    search,
    filterValues,
    refresh: fetchRows,
  }
}
