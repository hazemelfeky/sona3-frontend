import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { toUserMessage } from '@/utils/errors'

// family-photos is a PRIVATE bucket — there is no public URL. Every image
// shown in the UI goes through a signed URL minted at load time (same rule
// the avatars bucket follows in utils/avatar.ts) and expires an hour later,
// so these are never persisted anywhere.
const BUCKET = 'family-photos'
const SIGNED_URL_TTL = 3600

// family_attachments isn't in src/types/db.ts yet (run `pnpm gen:types`), so
// this goes through the untyped `db` alias — the same escape hatch the rest
// of the families code uses for this schema.
export interface FamilyPhoto {
  attachment_id: number
  storage_path: string
  caption: string | null
  created_at: string | null
  url: string | null
}

const PHOTO_COLUMNS = 'attachment_id, storage_path, caption, created_at'

// Storage keys stay ASCII — an Arabic filename survives the round trip far
// less predictably than a slug does, and the caption is where the human
// readable label belongs anyway.
function safeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase()
  return cleaned || 'photo'
}

export function useFamilyPhotos(familyId: Ref<number>) {
  const photos = ref<FamilyPhoto[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  // { done, total } while an upload batch is in flight, null otherwise.
  const uploadProgress = ref<{ done: number; total: number } | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('family_attachments')
        .select(PHOTO_COLUMNS)
        .eq('family_id', familyId.value)
        .eq('kind', 'photo')
        .order('created_at', { ascending: false })
      if (err) throw err

      const rows = (data ?? []) as Omit<FamilyPhoto, 'url'>[]
      if (!rows.length) {
        photos.value = []
        return
      }

      // One request for the whole gallery rather than a createSignedUrl per
      // thumbnail — same private-bucket mechanism, just batched.
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(
        rows.map((r) => r.storage_path),
        SIGNED_URL_TTL,
      )

      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
      photos.value = rows.map((row) => ({ ...row, url: urlByPath.get(row.storage_path) ?? null }))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل الصور')
      photos.value = []
    } finally {
      loading.value = false
    }
  }

  watch(familyId, load, { immediate: true })

  async function upload(files: File[], uploadedBy: string) {
    if (!files.length) return
    uploadProgress.value = { done: 0, total: files.length }
    try {
      for (const [index, file] of files.entries()) {
        let blob: Blob
        try {
          // Raw phone photos run ~4MB each; the bucket would fill fast
          // without this (see utils/compressImage.ts). 1600px keeps the
          // lightbox sharp while staying well under a megabyte.
          blob = await compressImage(file, 1600, 0.82)
        } catch {
          throw new Error(`الصورة "${file.name}" مش مدعومة. جرّب صورة تانية.`)
        }

        // family_id leads the path deliberately — the storage policy keys
        // off that first segment.
        const path = `${familyId.value}/${Date.now()}_${index}_${safeFileName(file.name)}.webp`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (uploadError) throw new Error('حصلت مشكلة أثناء رفع الصورة. حاول تاني.')

        const { error: insertError } = await db.from('family_attachments').insert({
          family_id: familyId.value,
          kind: 'photo',
          storage_path: path,
          uploaded_by: uploadedBy,
          caption: null,
        })
        // Without the row the file is an orphan nothing can reach, so clean
        // it back up rather than leave it billing storage.
        if (insertError) {
          await supabase.storage.from(BUCKET).remove([path])
          throw new Error('حصلت مشكلة أثناء حفظ الصورة. حاول تاني.')
        }

        uploadProgress.value = { done: index + 1, total: files.length }
      }
      await load()
    } finally {
      uploadProgress.value = null
    }
  }

  async function remove(photo: FamilyPhoto) {
    // Object first, row second: a failed object removal aborts with nothing
    // lost, and a failed row delete leaves a retry that heals itself
    // (removing an already-gone object succeeds).
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path])
    if (storageError) throw new Error('حصلت مشكلة أثناء حذف الصورة. حاول تاني.')

    const { error: rowError } = await db
      .from('family_attachments')
      .delete()
      .eq('attachment_id', photo.attachment_id)
    // Hiding the button without families.create is UX only — RLS is the
    // real gate, so a rejected delete still surfaces rather than failing
    // silently.
    if (rowError) throw new Error('حصلت مشكلة أثناء حذف الصورة. حاول تاني.')

    await load()
  }

  async function saveCaption(photo: FamilyPhoto, caption: string) {
    const value = caption.trim() || null
    const { error: err } = await db
      .from('family_attachments')
      .update({ caption: value })
      .eq('attachment_id', photo.attachment_id)
    if (err) throw new Error('حصلت مشكلة أثناء حفظ الوصف. حاول تاني.')

    const hit = photos.value.find((p) => p.attachment_id === photo.attachment_id)
    if (hit) hit.caption = value
  }

  return { photos, loading, error, uploadProgress, refresh: load, upload, remove, saveCaption }
}
