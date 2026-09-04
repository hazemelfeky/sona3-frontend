import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { getAvatarSignedUrl } from '@/utils/avatar'
import type { Database } from '@/types/db'
import { toUserMessage } from '@/utils/errors'
import { isOfflineError, OFFLINE_MESSAGE } from '@/utils/errors'

// `auth_email` is deliberately excluded — it's the throwaway placeholder
// address and must never land in app state, even for an admin viewing
// someone else's profile.
type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type FullProfile = Pick<
  ProfileRow,
  | 'user_id'
  | 'username'
  | 'full_name'
  | 'phone'
  | 'email'
  | 'area'
  | 'birth_date'
  | 'education'
  | 'job'
  | 'avatar_path'
  | 'status'
>
const PROFILE_COLUMNS =
  'user_id, username, full_name, phone, email, area, birth_date, education, job, avatar_path, status'

export function useProfile(userId: Ref<string>) {
  const profile = ref<FullProfile | null>(null)
  const avatarUrl = ref<string | null>(null)
  const notFound = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function loadAvatarUrl(path: string | null) {
    avatarUrl.value = await getAvatarSignedUrl(path)
  }

  async function load() {
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('user_id', userId.value)
        .maybeSingle<FullProfile>()
      if (err) throw err

      // No row back means either the profile genuinely doesn't exist, or
      // RLS hid it because the viewer lacks users.view — those two cases
      // must look identical, or the empty state itself confirms who's
      // registered.
      if (!data) {
        notFound.value = true
        profile.value = null
        return
      }

      profile.value = data
      await loadAvatarUrl(data.avatar_path)
    } catch (e) {
      error.value = toUserMessage(e, 'حصل خطأ غير متوقع أثناء تحميل البيانات')
    } finally {
      loading.value = false
    }
  }

  watch(userId, load, { immediate: true })

  return { profile, avatarUrl, notFound, loading, error, reload: load }
}

export interface ProfileUpdatePayload {
  full_name: string
  username: string
  phone: string | null
  email: string | null
  area: string | null
  birth_date: string | null
  education: string | null
  job: string | null
}

function translateProfileError(error: unknown): string {
  if (isOfflineError(error)) return OFFLINE_MESSAGE
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (raw.includes('IDENTIFIER_TAKEN')) return 'في بيانات مستخدمة قبل كده. جرّب رقم أو إيميل مختلف.'
  return 'حصلت مشكلة. حاول تاني.'
}

export async function updateMyProfile(userId: string, payload: ProfileUpdatePayload) {
  // Same typed-client generic gap as elsewhere (see lib/supabase.ts) —
  // .update() hits it even though .select() on the same table doesn't.
  const { error } = await db.from('profiles').update(payload).eq('user_id', userId)
  if (error) throw new Error(translateProfileError(error))
}

export async function uploadMyAvatar(userId: string, file: File) {
  let blob: Blob
  try {
    blob = await compressImage(file, 1024, 0.8)
  } catch {
    throw new Error('الصورة دي مش مدعومة. جرّب صورة تانية.')
  }

  // Path MUST start with the user's own id — the storage policy on the
  // private `avatars` bucket rejects anything else.
  const path = `${userId}/avatar.webp`
  console.log('uploading', blob)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/webp' })
  if (uploadError) throw new Error('حصلت مشكلة في رفع الصورة. حاول تاني.')

  // rpc() fights the typed client's literal-key generics here (same
  // reason lib/supabase.ts keeps the untyped `db` alias). Don't skip this
  // call — without it the file uploads but profiles.avatar_path never
  // points at it, leaving an orphan object in storage.
  const { error: rpcError } = (await db.rpc('set_my_avatar', { path })) as {
    error: { message: string } | null
  }
  if (rpcError) throw new Error('حصلت مشكلة في حفظ الصورة. حاول تاني.')
}
