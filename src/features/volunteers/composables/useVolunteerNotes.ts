import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import type { Database } from '@/types/db'

type NoteRow = Database['public']['Tables']['volunteer_notes']['Row']
export type NoteWithAuthor = NoteRow & { author_name: string | null }

export function useVolunteerNotes(userId: Ref<string>) {
  const rows = ref<NoteWithAuthor[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('volunteer_notes')
        .select('*')
        .eq('user_id', userId.value)
        .order('created_at', { ascending: false })
      if (err) throw err

      const list = (data ?? []) as NoteRow[]
      const authorIds = Array.from(new Set(list.map((r) => r.author_id).filter((id): id is string => !!id)))

      let names = new Map<string, string | null>()
      if (authorIds.length) {
        // .select() with a multi-column string loses literal typing against
        // the typed client here (same gap as useFamilyGroups.ts) — untyped
        // `db` + explicit cast sidesteps it.
        const { data: authors } = await db
          .from('v_user_directory')
          .select('user_id, full_name, username')
          .in('user_id', authorIds)
        const list = (authors ?? []) as Database['public']['Views']['v_user_directory']['Row'][]
        names = new Map(list.map((a) => [a.user_id, a.full_name || a.username]))
      }

      rows.value = list.map((r) => ({ ...r, author_name: r.author_id ? (names.get(r.author_id) ?? null) : null }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حصلت مشكلة أثناء تحميل الملاحظات'
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch(userId, load, { immediate: true })

  async function submit(body: string) {
    // Same typed-client insert() gap noted above.
    const { error: err } = await db.from('volunteer_notes').insert({ user_id: userId.value, body })
    if (err) throw new Error('حصلت مشكلة أثناء حفظ الملاحظة')
    await load()
  }

  return { rows, loading, error, submit, refresh: load }
}
