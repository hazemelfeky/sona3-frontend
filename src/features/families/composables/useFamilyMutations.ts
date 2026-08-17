import { db } from '@/lib/supabase'
import type { Database } from '@/types/db'
import {
  memberFormToPayload,
  NEED_STATUS_DEFAULT,
  NEED_STATUS_ACCEPTED,
  NEED_OTHER_CODE,
  type MemberFormState,
} from './useFamilyForm'

export type FamilyPayload = Database['public']['Tables']['families']['Insert']
export type MemberPayload = Database['public']['Tables']['members']['Insert']

function translateFamilyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (/permission|policy|row-level security|rls/i.test(raw)) return 'مش معاك صلاحية لتنفيذ الإجراء ده'
  return 'حصلت مشكلة. حاول تاني'
}

export async function createFamily(payload: FamilyPayload): Promise<number> {
  // db, not supabase — .insert() hits the typed client's generic gap on
  // this table (same reason lib/supabase.ts keeps the untyped alias).
  const { data, error } = await db.from('families').insert(payload).select('family_id').single()
  if (error) throw new Error(translateFamilyError(error))
  return (data as { family_id: number }).family_id
}

export async function updateFamily(id: number, payload: FamilyPayload): Promise<void> {
  const { error } = await db.from('families').update(payload).eq('family_id', id)
  if (error) throw new Error(translateFamilyError(error))
}

export async function deleteFamily(id: number): Promise<void> {
  const { error } = await db.from('families').delete().eq('family_id', id)
  if (error) throw new Error(translateFamilyError(error))
}

// Reconciles the form's member rows against what's already saved: rows
// without a member_id are new, rows whose member_id no longer appears in
// the form were removed in the UI, everything else is an update.
export async function saveFamilyMembers(
  familyId: number,
  members: MemberFormState[],
  originalMemberIds: number[] = [],
): Promise<void> {
  const keptIds = new Set(members.map((m) => m.member_id).filter((id): id is number => id != null))
  const toDelete = originalMemberIds.filter((id) => !keptIds.has(id))
  const toInsert = members.filter((m) => m.member_id == null)
  const toUpdate = members.filter((m): m is MemberFormState & { member_id: number } => m.member_id != null)

  if (toDelete.length) {
    const { error } = await db.from('members').delete().in('member_id', toDelete)
    if (error) throw new Error(translateFamilyError(error))
  }

  if (toInsert.length) {
    const { error } = await db
      .from('members')
      .insert(toInsert.map((m) => ({ ...memberFormToPayload(m), family_id: familyId })))
    if (error) throw new Error(translateFamilyError(error))
  }

  for (const m of toUpdate) {
    const { error } = await db.from('members').update(memberFormToPayload(m)).eq('member_id', m.member_id)
    if (error) throw new Error(translateFamilyError(error))
  }
}

export interface OriginalNeed {
  need_id: number
  need_code: string | null
  family_id: number | null
  source: 'column' | 'inferred' | null
  note: string | null
}

// Every catalog need_type gets a row once saved — the select always holds
// one of NEED_STATUS_OPTIONS, so there's no unset state to represent by
// omitting the row. NEED_OTHER_CODE ("أخرى") is just another catalog code:
// its note is otherNeedNote, and its status is forced to "مقبولة" whenever
// that note is non-empty (otherwise it falls back to the select like any
// other code) — there's no manual status control for it in the form.
//
// Existing rows are batched into one upsert (keyed on need_id, the real PK)
// instead of one PATCH per row. Every object in that batch carries the same
// full column set deliberately — PostgREST's bulk endpoint fills any key
// missing from a given row with NULL, so a partial {need_id, status} row
// sitting next to a full row in the same request would wipe that row's
// family_id/need_code/source/note.
export async function saveFamilyNeeds(
  familyId: number,
  allCodes: string[],
  statusByCode: Record<string, string>,
  otherNote: string,
  original: OriginalNeed[] = [],
): Promise<void> {
  const trimmedOther = otherNote.trim()

  const existingByCode = new Map<string, OriginalNeed>()
  for (const row of original) {
    if (row.need_code !== null) existingByCode.set(row.need_code, row)
  }

  // A code no longer in the catalog (removed upstream) has nowhere to
  // write a status — drop its stale row rather than leave it orphaned.
  const staleCodes = new Set(allCodes)
  const toDelete = [...existingByCode.entries()]
    .filter(([code]) => !staleCodes.has(code))
    .map(([, row]) => row.need_id)

  if (toDelete.length) {
    const { error } = await db.from('family_needs').delete().in('need_id', toDelete)
    if (error) throw new Error(translateFamilyError(error))
  }

  const toInsert: { family_id: number; need_code: string; status: string; note: string | null; source: 'column' }[] = []
  const toUpsert: {
    need_id: number
    family_id: number
    need_code: string
    status: string
    note: string | null
    source: string | null
  }[] = []
  for (const code of allCodes) {
    const isOther = code === NEED_OTHER_CODE
    const existing = existingByCode.get(code)
    const status = isOther && trimmedOther ? NEED_STATUS_ACCEPTED : (statusByCode[code] ?? NEED_STATUS_DEFAULT)
    const note = isOther ? trimmedOther || null : (existing?.note ?? null)
    if (existing) {
      toUpsert.push({
        need_id: existing.need_id,
        family_id: existing.family_id ?? familyId,
        need_code: code,
        status,
        note,
        source: existing.source ?? 'column',
      })
    } else {
      toInsert.push({ family_id: familyId, need_code: code, status, note, source: 'column' })
    }
  }

  if (toInsert.length) {
    const { error } = await db.from('family_needs').insert(toInsert)
    if (error) throw new Error(translateFamilyError(error))
  }
  if (toUpsert.length) {
    const { error } = await db.from('family_needs').upsert(toUpsert, { onConflict: 'need_id' })
    if (error) throw new Error(translateFamilyError(error))
  }
}
