import { ref, watch, type Ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { toUserMessage } from '@/utils/errors'
import type { Database } from '@/types/db'

// Aid photos share the PRIVATE family-photos bucket — signed URLs only,
// never getPublicUrl (same rule as useFamilyPhotos and useStock).
const PHOTO_BUCKET = 'family-photos'
const SIGNED_URL_TTL = 3600

// v_aid_list is one row per aid, already folded over items and volunteers.
// The aid tables aren't in src/types/db.ts yet (run `pnpm gen:types`), so
// this goes through the untyped `db` alias.
export interface AidListRow {
  aid_id: number
  aid_date: string | null
  note: string | null
  family_id: number
  family_head: string | null
  family_area: string | null
  volunteers_names: string | null
  volunteers_count: number
  items_summary: string | null
  items_count: number
  total_cash: number
  // Inventory handed over, valued at the lot's unit_price. A تبرع عيني lot
  // has no price, so it contributes 0 — it is given away, not costed.
  total_inventory_value: number
  total_value: number
  has_inventory: boolean
  has_cash: boolean
  created_by: string | null
  created_at: string | null
}

const AID_LIST_COLUMNS =
  'aid_id, aid_date, note, family_id, family_head, family_area, volunteers_names, volunteers_count, items_summary, items_count, total_cash, total_inventory_value, total_value, has_inventory, has_cash, created_by, created_at'

// The detail page prices every line, which v_family_aid_history can't do —
// it carries no lot_id, so there is nothing to look a unit_price up by. The
// rows are read from aid_items instead, with stock_lots supplying the name
// and the price behind each inventory line.
export interface AidDetailItem {
  item_id: number
  item_type: 'inventory' | 'cash'
  name: string | null
  quantity: number | null
  amount: number | null
  // Inventory only. null is a تبرع عيني — priceless, not free, so the UI says
  // so rather than printing "0 ج".
  unit_price: number | null
  // What this line is worth: the amount for cash, quantity × unit_price for
  // priced inventory, 0 for a تبرع عيني.
  value: number
}

async function loadAidItems(aidId: number): Promise<AidDetailItem[]> {
  const { data, error } = await db
    .from('aid_items')
    .select('item_id, item_type, lot_id, quantity, name, amount')
    .eq('aid_id', aidId)
    .order('item_id')
  if (error) throw error

  const rows = (data ?? []) as {
    item_id: number
    item_type: 'inventory' | 'cash'
    lot_id: number | null
    quantity: number | null
    name: string | null
    amount: number | null
  }[]

  const lotIds = [
    ...new Set(rows.map((row) => row.lot_id).filter((id): id is number => id !== null)),
  ]
  const lots = new Map<number, { name: string | null; unit_price: number | null }>()
  if (lotIds.length) {
    const { data: lotRows, error: lotsError } = await db
      .from('stock_lots')
      .select('lot_id, name, unit_price')
      .in('lot_id', lotIds)
    if (lotsError) throw lotsError
    for (const lot of (lotRows ?? []) as {
      lot_id: number
      name: string | null
      unit_price: number | null
    }[]) {
      lots.set(lot.lot_id, { name: lot.name, unit_price: lot.unit_price })
    }
  }

  return rows.map((row) => {
    if (row.item_type === 'cash') {
      const amount = Number(row.amount ?? 0)
      return {
        item_id: row.item_id,
        item_type: 'cash' as const,
        name: row.name,
        quantity: null,
        amount,
        unit_price: null,
        value: amount,
      }
    }
    const lot = row.lot_id === null ? undefined : lots.get(row.lot_id)
    const quantity = Number(row.quantity ?? 0)
    const unitPrice = lot?.unit_price ?? null
    return {
      item_id: row.item_id,
      item_type: 'inventory' as const,
      name: lot?.name ?? row.name,
      quantity,
      amount: null,
      unit_price: unitPrice,
      value: unitPrice === null ? 0 : quantity * Number(unitPrice),
    }
  })
}

export interface AidPhoto {
  attachment_id: number
  storage_path: string
  caption: string | null
  url: string | null
}

async function signUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map()
  // One request for the whole gallery rather than a createSignedUrl per photo.
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  const map = new Map<string, string>()
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl)
  }
  return map
}

async function loadVolunteerNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (!ids.length) return names
  const { data } = await db
    .from('v_user_directory')
    .select('user_id, full_name, username')
    .in('user_id', ids)
  for (const person of (data ?? []) as Database['public']['Views']['v_user_directory']['Row'][]) {
    names.set(person.user_id, person.full_name || person.username || '—')
  }
  return names
}

/**
 * The whole executions list, plus the aid -> volunteer links behind it.
 *
 * Everything is fetched once and filtered in the page, because the stat cards
 * have to describe the *filtered* set — a server-side count would describe the
 * table instead. The volunteer filter rides on the link rows rather than on
 * v_aid_list's volunteers_names string, so two people sharing a first name
 * can't match each other.
 */
export function useAidList() {
  const rows = ref<AidListRow[]>([])
  const aidsByVolunteer = ref<Map<string, Set<number>>>(new Map())
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [list, links] = await Promise.all([
        db.from('v_aid_list').select(AID_LIST_COLUMNS).order('aid_date', { ascending: false }),
        db.from('aid_volunteers').select('aid_id, volunteer_id'),
      ])
      if (list.error) throw list.error
      if (links.error) throw links.error

      rows.value = (list.data ?? []) as AidListRow[]

      const byVolunteer = new Map<string, Set<number>>()
      for (const link of (links.data ?? []) as { aid_id: number; volunteer_id: string }[]) {
        let set = byVolunteer.get(link.volunteer_id)
        if (!set) {
          set = new Set()
          byVolunteer.set(link.volunteer_id, set)
        }
        set.add(link.aid_id)
      }
      aidsByVolunteer.value = byVolunteer
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل التنفيذات')
      rows.value = []
      aidsByVolunteer.value = new Map()
    } finally {
      loading.value = false
    }
  }

  void load()

  return { rows, aidsByVolunteer, loading, error, refresh: load }
}

export function useAidDetail(aidId: Ref<number>) {
  const aid = ref<AidListRow | null>(null)
  const items = ref<AidDetailItem[]>([])
  const volunteers = ref<string[]>([])
  const photos = ref<AidPhoto[]>([])
  const notFound = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const [summary, aidItems, links, attachments] = await Promise.all([
        db.from('v_aid_list').select(AID_LIST_COLUMNS).eq('aid_id', aidId.value).maybeSingle(),
        loadAidItems(aidId.value),
        db.from('aid_volunteers').select('volunteer_id').eq('aid_id', aidId.value),
        db
          .from('family_attachments')
          .select('attachment_id, storage_path, caption')
          .eq('aid_id', aidId.value)
          .order('attachment_id'),
      ])
      if (summary.error) throw summary.error
      if (links.error) throw links.error
      if (attachments.error) throw attachments.error

      // No row means it's gone, or RLS hid it — both must look the same.
      if (!summary.data) {
        notFound.value = true
        aid.value = null
        items.value = []
        volunteers.value = []
        photos.value = []
        return
      }

      aid.value = summary.data as AidListRow
      items.value = aidItems

      const ids = ((links.data ?? []) as { volunteer_id: string }[]).map((l) => l.volunteer_id)
      const names = await loadVolunteerNames(ids)
      volunteers.value = ids.map((id) => names.get(id) ?? '—')

      const photoRows = (attachments.data ?? []) as Omit<AidPhoto, 'url'>[]
      const urls = await signUrls(photoRows.map((row) => row.storage_path))
      photos.value = photoRows.map((row) => ({
        ...row,
        url: urls.get(row.storage_path) ?? null,
      }))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل التنفيذ')
      aid.value = null
      items.value = []
      volunteers.value = []
      photos.value = []
    } finally {
      loading.value = false
    }
  }

  watch(aidId, load, { immediate: true })

  return { aid, items, volunteers, photos, notFound, loading, error, reload: load }
}

// aid_items and aid_volunteers cascade in the DB, and the stock balance is a
// view over what's left in aid_items, so it recomputes on its own. Only the
// photos need clearing by hand: their objects never cascade, and a deleted
// aid leaves nothing that could ever reach them again.
export async function deleteAid(aidId: number) {
  const { data, error: photosError } = await db
    .from('family_attachments')
    .select('attachment_id, storage_path')
    .eq('aid_id', aidId)
  if (photosError) {
    throw new Error(toUserMessage(photosError, 'حصلت مشكلة أثناء حذف التنفيذ. حاول تاني.'))
  }

  const photoRows = (data ?? []) as { attachment_id: number; storage_path: string }[]
  if (photoRows.length) {
    // Objects first, rows second: a failed removal aborts with nothing lost.
    const { error: storageError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photoRows.map((row) => row.storage_path))
    if (storageError) throw new Error('حصلت مشكلة أثناء حذف صور التنفيذ. حاول تاني.')

    const { error: rowsError } = await db.from('family_attachments').delete().eq('aid_id', aidId)
    if (rowsError) {
      throw new Error(toUserMessage(rowsError, 'حصلت مشكلة أثناء حذف صور التنفيذ. حاول تاني.'))
    }
  }

  // Hiding the button without operations.manage is UX only — RLS is the real gate,
  // so a rejected delete still surfaces here.
  const { error } = await db.from('aid').delete().eq('aid_id', aidId)
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء حذف التنفيذ. حاول تاني.'))
}
