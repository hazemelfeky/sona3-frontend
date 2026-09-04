import { ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { db } from '@/lib/supabase'
import type { Database } from '@/types/db'
import { toUserMessage } from '@/utils/errors'

export type VolunteerRow = Database['public']['Views']['v_volunteers']['Row']
export type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
export type StateFilter = 'all' | 'new' | 'active' | 'core' | 'leader' | 'inactive'

export function useVolunteersList() {
  const rows = ref<VolunteerRow[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const search = ref('')
  const statusFilter = ref<StatusFilter>('all')
  const stateFilter = ref<StateFilter>('all')
  const debouncedSearch = refDebounced(search, 300)

  async function load() {
    loading.value = true
    error.value = null
    try {
      let query = db.from('v_volunteers').select('*').order('full_name')
      if (statusFilter.value !== 'all') query = query.eq('status', statusFilter.value)
      if (stateFilter.value !== 'all') query = query.eq('volunteer_state', stateFilter.value)
      if (debouncedSearch.value) query = query.ilike('search_text', `%${debouncedSearch.value}%`)

      const { data, error: err } = await query
      if (err) throw err

      const list = (data ?? []) as VolunteerRow[]
      // Array.sort is stable (ES2019+), so this only reorders pending vs.
      // not-pending and keeps the query's alphabetical order within each.
      rows.value = list.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
    } catch (e) {
      error.value = toUserMessage(e, 'حدث خطأ غير متوقع أثناء تحميل المتطوعين')
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch([debouncedSearch, statusFilter, stateFilter], load, { immediate: true })

  return { rows, loading, error, search, statusFilter, stateFilter, refresh: load }
}
