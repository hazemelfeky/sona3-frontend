import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

export type NeedType = Database['public']['Tables']['need_types']['Row']

// Static reference data, shared across every consumer — module-level so
// it's fetched once per session, not once per family form.
const needTypes = ref<NeedType[]>([])
const loaded = ref(false)
const loading = ref(false)

async function ensureLoaded() {
  if (loaded.value || loading.value) return
  loading.value = true
  try {
    const { data } = await supabase.from('need_types').select('*').order('sort_order')
    needTypes.value = data ?? []
    loaded.value = true
  } finally {
    loading.value = false
  }
}

export function useNeedTypesCatalog() {
  void ensureLoaded()
  return { needTypes, loading }
}
