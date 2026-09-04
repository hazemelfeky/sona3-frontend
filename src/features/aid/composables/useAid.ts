import { ref } from 'vue'
import { supabase, db } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { toUserMessage } from '@/utils/errors'
import type { Database } from '@/types/db'

// Aid photos live in the same PRIVATE family-photos bucket as the rest of a
// family's images — signed URLs only, never getPublicUrl.
const PHOTO_BUCKET = 'family-photos'

// The aid tables aren't in src/types/db.ts yet (run `pnpm gen:types`), so
// these go through the untyped `db` alias.
export interface VolunteerOption {
  user_id: string
  label: string
}

export interface AvailableLot {
  lot_id: number
  name: string | null
  quantity_left: number
}

// UInput with type="number" coerces its emitted value to a number (it runs
// looseToNumber internally), while the initial/cleared value is ''. Both
// shapes reach these fields, so both are accepted and coerced at the edges.
export type AidItemDraft =
  | { kind: 'inventory'; lot_id: number | null; quantity: number | string }
  | { kind: 'cash'; name: string; amount: number | string }

// '' -> NaN, so an empty box fails a Number.isFinite check rather than
// silently counting as 0.
export function draftNumber(value: number | string): number {
  return String(value).trim() === '' ? Number.NaN : Number(value)
}

export interface AidHistoryRow {
  family_id: number
  aid_id: number
  aid_date: string | null
  item_id: number | null
  item_type: 'inventory' | 'cash' | null
  item_name: string | null
  quantity: number | null
  amount: number | null
}

export interface AidVisit {
  aid_id: number
  aid_date: string | null
  volunteers: string[]
  items: AidHistoryRow[]
  cashTotal: number
}

export function useVolunteerOptions() {
  const options = ref<VolunteerOption[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('v_volunteers')
        .select('user_id, full_name, username, status')
        .eq('status', 'approved')
        .order('full_name')
      if (err) throw err
      const rows = (data ?? []) as { user_id: string; full_name: string | null; username: string }[]
      options.value = rows.map((r) => ({ user_id: r.user_id, label: r.full_name || r.username }))
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المتطوعين')
      options.value = []
    } finally {
      loading.value = false
    }
  }

  void load()
  return { options, loading, error, refresh: load }
}

export function useAvailableLots() {
  const lots = ref<AvailableLot[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('v_stock_balance')
        .select('lot_id, name, quantity_left')
        .gt('quantity_left', 0)
        .order('name')
      if (err) throw err
      lots.value = (data ?? []) as AvailableLot[]
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل المخزون')
      lots.value = []
    } finally {
      loading.value = false
    }
  }

  void load()
  return { lots, loading, error, refresh: load }
}

// PostgREST fills any key missing from one row of a bulk insert with NULL,
// so every row carries the full column set — a partial row sitting next to a
// full one would blank the other's columns. It also keeps each row exactly
// the shape the aid_items CHECK constraint demands: inventory rows carry
// lot_id + quantity with name/amount NULL, cash rows the reverse.
function itemRow(aidId: number, item: AidItemDraft) {
  if (item.kind === 'inventory') {
    return {
      aid_id: aidId,
      item_type: 'inventory',
      lot_id: item.lot_id,
      quantity: Number(item.quantity),
      name: null,
      amount: null,
    }
  }
  return {
    aid_id: aidId,
    item_type: 'cash',
    lot_id: null,
    quantity: null,
    name: item.name.trim(),
    amount: Number(item.amount),
  }
}

export interface CreateAidInput {
  familyId: number
  aidDate: string
  note: string | null
  items: AidItemDraft[]
  volunteerIds: string[]
  createdBy: string
}

// There is no transaction across these calls — PostgREST has no multi-table
// one. The aid row goes first so everything else has a parent, and a failure
// after it leaves an aid with fewer children rather than orphans.
export async function createAid(input: CreateAidInput): Promise<number> {
  const { data, error } = await db
    .from('aid')
    .insert({
      family_id: input.familyId,
      aid_date: input.aidDate,
      note: input.note,
      created_by: input.createdBy,
    })
    .select('aid_id')
    .single()
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء تسجيل التنفيذ. حاول تاني.'))

  const aidId = (data as { aid_id: number }).aid_id

  if (input.items.length) {
    const { error: itemsError } = await db
      .from('aid_items')
      .insert(input.items.map((item) => itemRow(aidId, item)))
    if (itemsError) {
      throw new Error(toUserMessage(itemsError, 'حصلت مشكلة أثناء حفظ المساعدات. حاول تاني.'))
    }
  }

  if (input.volunteerIds.length) {
    const { error: volunteersError } = await db
      .from('aid_volunteers')
      .insert(input.volunteerIds.map((volunteer_id) => ({ aid_id: aidId, volunteer_id })))
    if (volunteersError) {
      throw new Error(toUserMessage(volunteersError, 'حصلت مشكلة أثناء حفظ المتطوعين. حاول تاني.'))
    }
  }

  return aidId
}

export interface AidEditRecord {
  aid_id: number
  family_id: number
  aid_date: string | null
  note: string | null
  items: AidItemDraft[]
  volunteerIds: string[]
  // What this aid already took out of each lot. v_stock_balance's
  // quantity_left has those quantities subtracted already, so an edit has to
  // add them back before it can tell whether the new numbers overdraw.
  lotBaseline: Record<number, number>
}

interface AidItemRow {
  item_id: number
  item_type: 'inventory' | 'cash'
  lot_id: number | null
  quantity: number | null
  name: string | null
  amount: number | null
}

export async function fetchAidForEdit(aidId: number): Promise<AidEditRecord | null> {
  const { data, error } = await db
    .from('aid')
    .select('aid_id, family_id, aid_date, note')
    .eq('aid_id', aidId)
    .maybeSingle()
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء تحميل التنفيذ'))
  // No row means it's gone, or RLS hid it — both must look the same.
  if (!data) return null
  const aid = data as {
    aid_id: number
    family_id: number
    aid_date: string | null
    note: string | null
  }

  const [itemsResult, volunteersResult] = await Promise.all([
    db
      .from('aid_items')
      .select('item_id, item_type, lot_id, quantity, name, amount')
      .eq('aid_id', aidId)
      .order('item_id'),
    db.from('aid_volunteers').select('volunteer_id').eq('aid_id', aidId),
  ])
  if (itemsResult.error)
    throw new Error(toUserMessage(itemsResult.error, 'حصلت مشكلة أثناء تحميل المساعدات'))
  if (volunteersResult.error) {
    throw new Error(toUserMessage(volunteersResult.error, 'حصلت مشكلة أثناء تحميل المتطوعين'))
  }

  const itemRows = (itemsResult.data ?? []) as AidItemRow[]
  const lotBaseline: Record<number, number> = {}
  const items: AidItemDraft[] = itemRows.map((row) => {
    if (row.item_type === 'inventory') {
      if (row.lot_id !== null) {
        lotBaseline[row.lot_id] = (lotBaseline[row.lot_id] ?? 0) + Number(row.quantity ?? 0)
      }
      return { kind: 'inventory', lot_id: row.lot_id, quantity: String(row.quantity ?? '') }
    }
    return { kind: 'cash', name: row.name ?? '', amount: String(row.amount ?? '') }
  })

  return {
    aid_id: aid.aid_id,
    family_id: aid.family_id,
    aid_date: aid.aid_date,
    note: aid.note,
    items,
    volunteerIds: ((volunteersResult.data ?? []) as { volunteer_id: string }[]).map(
      (row) => row.volunteer_id,
    ),
    lotBaseline,
  }
}

export interface UpdateAidInput {
  aidId: number
  aidDate: string
  note: string | null
  items: AidItemDraft[]
  volunteerIds: string[]
}

// Children are replaced wholesale rather than diffed: an aid carries a
// handful of rows, and matching them up would buy nothing over a delete and
// re-insert. As with createAid there is no transaction across the calls, so
// the parent row is updated first and each child set is emptied only right
// before it is refilled.
export async function updateAid(input: UpdateAidInput): Promise<void> {
  const { error } = await db
    .from('aid')
    .update({ aid_date: input.aidDate, note: input.note })
    .eq('aid_id', input.aidId)
  if (error) throw new Error(toUserMessage(error, 'حصلت مشكلة أثناء تعديل التنفيذ. حاول تاني.'))

  const { error: clearItems } = await db.from('aid_items').delete().eq('aid_id', input.aidId)
  if (clearItems) {
    throw new Error(toUserMessage(clearItems, 'حصلت مشكلة أثناء حفظ المساعدات. حاول تاني.'))
  }
  if (input.items.length) {
    const { error: itemsError } = await db
      .from('aid_items')
      .insert(input.items.map((item) => itemRow(input.aidId, item)))
    if (itemsError) {
      throw new Error(toUserMessage(itemsError, 'حصلت مشكلة أثناء حفظ المساعدات. حاول تاني.'))
    }
  }

  const { error: clearVolunteers } = await db
    .from('aid_volunteers')
    .delete()
    .eq('aid_id', input.aidId)
  if (clearVolunteers) {
    throw new Error(toUserMessage(clearVolunteers, 'حصلت مشكلة أثناء حفظ المتطوعين. حاول تاني.'))
  }
  if (input.volunteerIds.length) {
    const { error: volunteersError } = await db
      .from('aid_volunteers')
      .insert(input.volunteerIds.map((volunteer_id) => ({ aid_id: input.aidId, volunteer_id })))
    if (volunteersError) {
      throw new Error(toUserMessage(volunteersError, 'حصلت مشكلة أثناء حفظ المتطوعين. حاول تاني.'))
    }
  }
}

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

// Same flow as FamilyPhotos: compress, upload under the family's own path
// prefix, then link the row — and clean the object back up if the link fails.
export async function uploadAidPhotos(
  familyId: number,
  aidId: number,
  files: File[],
  uploadedBy: string,
  onProgress?: (done: number, total: number) => void,
) {
  for (const [index, file] of files.entries()) {
    let blob: Blob
    try {
      blob = await compressImage(file, 1600, 0.82)
    } catch {
      throw new Error(`الصورة "${file.name}" مش مدعومة. جرّب صورة تانية.`)
    }

    const path = `${familyId}/${Date.now()}_${index}_${safeFileName(file.name)}.webp`
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: 'image/webp', upsert: false })
    if (uploadError) throw new Error('حصلت مشكلة أثناء رفع الصور. حاول تاني.')

    const { error: rowError } = await db.from('family_attachments').insert({
      family_id: familyId,
      kind: 'photo',
      storage_path: path,
      uploaded_by: uploadedBy,
      caption: null,
      aid_id: aidId,
    })
    if (rowError) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
      throw new Error('حصلت مشكلة أثناء حفظ الصور. حاول تاني.')
    }

    onProgress?.(index + 1, files.length)
  }
}

export function useFamilyAidHistory(familyId: () => number) {
  const visits = ref<AidVisit[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('v_family_aid_history')
        .select('family_id, aid_id, aid_date, item_id, item_type, item_name, quantity, amount')
        .eq('family_id', familyId())
        .order('aid_date', { ascending: false })
      if (err) throw err

      const rows = (data ?? []) as AidHistoryRow[]

      // One row per item; fold them into one entry per visit.
      const byAid = new Map<number, AidVisit>()
      for (const row of rows) {
        let visit = byAid.get(row.aid_id)
        if (!visit) {
          visit = {
            aid_id: row.aid_id,
            aid_date: row.aid_date,
            volunteers: [],
            items: [],
            cashTotal: 0,
          }
          byAid.set(row.aid_id, visit)
        }
        // A visit with no items still yields one row, with a null item_id.
        if (row.item_id !== null) {
          visit.items.push(row)
          if (row.item_type === 'cash') visit.cashTotal += Number(row.amount ?? 0)
        }
      }

      const list = [...byAid.values()]
      if (list.length) {
        const aidIds = list.map((v) => v.aid_id)
        const { data: links } = await db
          .from('aid_volunteers')
          .select('aid_id, volunteer_id')
          .in('aid_id', aidIds)
        const linkRows = (links ?? []) as { aid_id: number; volunteer_id: string }[]

        const ids = [...new Set(linkRows.map((l) => l.volunteer_id))]
        const names = new Map<string, string>()
        if (ids.length) {
          const { data: people } = await db
            .from('v_user_directory')
            .select('user_id, full_name, username')
            .in('user_id', ids)
          for (const p of (people ??
            []) as Database['public']['Views']['v_user_directory']['Row'][]) {
            names.set(p.user_id, p.full_name || p.username || '—')
          }
        }

        const byId = new Map(list.map((v) => [v.aid_id, v]))
        for (const link of linkRows) {
          byId.get(link.aid_id)?.volunteers.push(names.get(link.volunteer_id) ?? '—')
        }
      }

      visits.value = list
    } catch (e) {
      error.value = toUserMessage(e, 'حصلت مشكلة أثناء تحميل سجل التنفيذات')
      visits.value = []
    } finally {
      loading.value = false
    }
  }

  void load()
  return { visits, loading, error, refresh: load }
}
