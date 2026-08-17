import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

export type PermissionDef = Database['public']['Tables']['permissions']['Row']
export type PermissionTemplate = Database['public']['Tables']['permission_templates']['Row']

// Static reference data (the permission dictionary + templates), shared
// across every consumer — the permission editor and the profile page's
// read-only permissions list both need code -> label_ar. Module-level so
// it's fetched once per session, not once per page visit.
const permissions = ref<PermissionDef[]>([])
const templates = ref<PermissionTemplate[]>([])
const loaded = ref(false)
const loading = ref(false)

async function ensureLoaded() {
  if (loaded.value || loading.value) return
  loading.value = true
  try {
    const [permsRes, templatesRes] = await Promise.all([
      supabase.from('permissions').select('*').order('sort_order'),
      supabase.from('permission_templates').select('*'),
    ])
    permissions.value = permsRes.data ?? []
    templates.value = templatesRes.data ?? []
    loaded.value = true
  } finally {
    loading.value = false
  }
}

export function usePermissionsCatalog() {
  void ensureLoaded()

  const labelFor = (code: string) => permissions.value.find((p) => p.code === code)?.label_ar ?? code

  const grouped = computed(() => {
    const groups = new Map<string, PermissionDef[]>()
    for (const perm of permissions.value) {
      if (!groups.has(perm.category)) groups.set(perm.category, [])
      groups.get(perm.category)!.push(perm)
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }))
  })

  return { permissions, templates, grouped, loading, labelFor }
}
