import { supabase } from '@/lib/supabase'

// Signed URL, not cached — it expires in 1h, generated fresh per call.
export async function getAvatarSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
