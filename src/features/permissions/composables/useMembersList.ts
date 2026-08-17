import { ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { db } from '@/lib/supabase'
import type { Database } from '@/types/db'

export type MemberRow = Database['public']['Views']['v_users_with_perms']['Row']
export type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export function useMembersList() {
  const rows = ref<MemberRow[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const search = ref('')
  const statusFilter = ref<StatusFilter>('all')
  const debouncedSearch = refDebounced(search, 300)

  async function load() {
    loading.value = true
    error.value = null
    try {
      let query = db.from('v_users_with_perms').select('*').order('full_name')
      if (statusFilter.value !== 'all') query = query.eq('status', statusFilter.value)
      if (debouncedSearch.value) query = query.ilike('full_name', `%${debouncedSearch.value}%`)

      const { data, error: err } = await query
      if (err) throw err

      const list = (data ?? []) as MemberRow[]
      // Array.sort is stable (ES2019+), so this only reorders pending vs.
      // not-pending and keeps the query's alphabetical order within each.
      rows.value = list.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء تحميل الأعضاء'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch([debouncedSearch, statusFilter], load, { immediate: true })

  return { rows, loading, error, search, statusFilter, refresh: load }
}
