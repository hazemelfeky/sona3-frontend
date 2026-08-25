import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { getAvatarSignedUrl } from '@/utils/avatar'
import type { Database } from '@/types/db'

export type VolunteerRow = Database['public']['Views']['v_volunteers']['Row']
type ProfileExtra = Pick<Database['public']['Tables']['profiles']['Row'], 'education' | 'job'>

export function useVolunteerDetail(userId: Ref<string>) {
  const volunteer = ref<VolunteerRow | null>(null)
  const extra = ref<ProfileExtra | null>(null)
  const avatarUrl = ref<string | null>(null)
  const notFound = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const { data, error: err } = await supabase
        .from('v_volunteers')
        .select('*')
        .eq('user_id', userId.value)
        .maybeSingle<VolunteerRow>()
      if (err) throw err

      if (!data) {
        notFound.value = true
        volunteer.value = null
        return
      }

      volunteer.value = data
      avatarUrl.value = await getAvatarSignedUrl(data.avatar_path)

      // education/job aren't on v_volunteers — pulled from profiles directly,
      // same as the profile feature does for viewing someone else's page.
      const { data: profileData } = await db
        .from('profiles')
        .select('education, job')
        .eq('user_id', userId.value)
        .maybeSingle<ProfileExtra>()
      extra.value = profileData ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'حصلت مشكلة أثناء التحميل'
    } finally {
      loading.value = false
    }
  }

  watch(userId, load, { immediate: true })

  return { volunteer, extra, avatarUrl, notFound, loading, error, reload: load }
}
