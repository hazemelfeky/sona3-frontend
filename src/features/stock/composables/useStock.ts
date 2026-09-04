import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { toUserMessage } from '@/utils/errors'

// stock-photos is a PRIVATE bucket — no public URL exists. Images are shown
// through signed URLs minted at load and expiring an hour later, exactly as
// the avatars and family-photos buckets are handled.
const BUCKET = 'stock-photos'
const SIGNED_URL_TTL = 3600

// The stock tables aren't in src/types/db.ts yet (run `pnpm gen:types`), so
// these go through the untyped `db` alias — the same escape hatch the rest
// of the app uses for this schema.
export interface StockBalanceRow {
  lot_id: number
  name: string | null
  unit_price: number | null
  quantity_in: number
  image_path: string | null
  note: string | null
  received_at: string | null
  quantity_out: number
  quantity_left: number
  status: 'available' | 'empty'
}

export interface StockDistributionRow {
  item_id: number
  lot_id: number
  product_name: string | null
  family_id: number
  family_head: string | null
  family_area: string | null
  quantity: number
  distributed_at: string | null
}

const BALANCE_COLUMNS =
  'lot_id, name, unit_price, quantity_in, image_path, note, received_at, quantity_out, quantity_left, status'
const DISTRIBUTION_COLUMNS =
  'item_id, lot_id, product_name, family_id, family_head, family_area, quantity, distributed_at'

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

async function signUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map()
  // One request for the whole page of thumbnails rather than a
  // createSignedUrl per row.
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  const map = new Map<string, string>()
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl)
  }
  return map
}

export function useStockList() {
  const rows = ref<StockBalanceRow[]>([])
  const imageUrls = ref<Record<string, string>>({})
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('v_stock_balance')
        .select(BALANCE_COLUMNS)
        .order('received_at', { ascending: false })
      if (err) throw err

      rows.value = (data ?? []) as StockBalanceRow[]
      const paths = rows.value.map((r) => r.image_path).filter((p): p is string => Boolean(p))
      imageUrls.value = Object.fromEntries(await signUrls(paths))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المخزون')
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  void load()

  return { rows, imageUrls, loading, error, refresh: load }
}

export function useStockLot(lotId: Ref<number>) {
  const lot = ref<StockBalanceRow | null>(null)
  const imageUrl = ref<string | null>(null)
  const distributions = ref<StockDistributionRow[]>([])
  const notFound = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    notFound.value = false
    imageUrl.value = null
    try {
      const [balance, detail] = await Promise.all([
        db.from('v_stock_balance').select(BALANCE_COLUMNS).eq('lot_id', lotId.value).maybeSingle(),
        db
          .from('v_stock_distributions_detail')
          .select(DISTRIBUTION_COLUMNS)
          .eq('lot_id', lotId.value)
          .order('distributed_at', { ascending: false }),
      ])
      if (balance.error) throw balance.error
      if (detail.error) throw detail.error

      // No row means it's gone, or RLS hid it — both must look the same.
      if (!balance.data) {
        notFound.value = true
        lot.value = null
        distributions.value = []
        return
      }

      lot.value = balance.data as StockBalanceRow
      distributions.value = (detail.data ?? []) as StockDistributionRow[]
      if (lot.value.image_path) {
        const signed = await signUrls([lot.value.image_path])
        imageUrl.value = signed.get(lot.value.image_path) ?? null
      }
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المنتج')
      lot.value = null
      distributions.value = []
    } finally {
      loading.value = false
    }
  }

  watch(lotId, load, { immediate: true })

  return { lot, imageUrl, distributions, notFound, loading, error, reload: load }
}

export interface StockLotPayload {
  name: string
  // null is meaningful here: an in-kind donation (تبرع عيني) has no price.
  unit_price: number | null
  quantity_in: number
  received_at: string
  note: string | null
}

// Upload happens after the row exists so the object key can lead with
// lot_id, the way the avatars and family-photos policies expect.
async function uploadLotImage(lotId: number, file: File): Promise<string> {
  let blob: Blob
  try {
    blob = await compressImage(file, 1600, 0.82)
  } catch {
    throw new Error('الصورة دي مش مدعومة. جرّب صورة تانية.')
  }

  const path = `${lotId}/${Date.now()}_${safeFileName(file.name)}.webp`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error('حصلت مشكلة أثناء رفع الصورة. حاول تاني.')
  return path
}

export async function createLot(payload: StockLotPayload, createdBy: string, image: File | null) {
  const { data, error } = await db
    .from('stock_lots')
    .insert({ ...payload, created_by: createdBy })
    .select('lot_id')
    .single()
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء حفظ المنتج. حاول تاني.'))

  const lotId = (data as { lot_id: number }).lot_id
  if (!image) return lotId

  const path = await uploadLotImage(lotId, image)
  const { error: linkError } = await db
    .from('stock_lots')
    .update({ image_path: path })
    .eq('lot_id', lotId)
  // Without the link the object is unreachable, so don't leave it billing
  // storage.
  if (linkError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error('حصلت مشكلة أثناء حفظ الصورة. حاول تاني.')
  }
  return lotId
}

export async function updateLot(
  lotId: number,
  payload: StockLotPayload,
  image: File | null,
  previousPath: string | null,
) {
  const patch: Record<string, unknown> = { ...payload }
  let uploadedPath: string | null = null
  if (image) {
    uploadedPath = await uploadLotImage(lotId, image)
    patch.image_path = uploadedPath
  }

  const { error } = await db.from('stock_lots').update(patch).eq('lot_id', lotId)
  if (error) {
    if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath])
    throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء تعديل المنتج. حاول تاني.'))
  }

  // Only once the row points at the new object is the old one safe to drop.
  if (uploadedPath && previousPath) {
    await supabase.storage.from(BUCKET).remove([previousPath])
  }
}

export async function deleteLot(lotId: number, imagePath: string | null) {
  // Distributions cascade in the DB; only the stored object needs clearing
  // up here, and it goes first so a failure aborts with nothing lost.
  if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath])

  const { error } = await db.from('stock_lots').delete().eq('lot_id', lotId)
  // Hiding the button without stock.manage is UX only — RLS is the real
  // gate, so a rejected delete still surfaces here.
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء مسح المنتج. حاول تاني.'))
}
