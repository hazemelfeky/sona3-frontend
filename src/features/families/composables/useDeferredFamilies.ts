import { db } from '@/lib/supabase'

// A deferred family is just a families row parked at record_status 'draft' —
// basic capture now, full research later, at which point it flips to
// 'active'. record_status / created_by aren't in src/types/db.ts yet (run
// `pnpm gen:types`), so these go through the untyped `db` alias — the same
// escape hatch createFamily() already uses for this table.
export const DEFERRED_STATUS = 'draft'

export interface DeferredFamilyForm {
  head_name: string
  area: string
  address: string
  head_phone: string
  needs_raw: string
  general_notes: string
  // No spouse fields exist on this form, so there's nothing to clear — the
  // flag is captured now so the full research later starts from it.
  is_widow: boolean
}

export function emptyDeferredForm(): DeferredFamilyForm {
  return {
    head_name: '',
    area: '',
    address: '',
    head_phone: '',
    needs_raw: '',
    general_notes: '',
    is_widow: false,
  }
}

function translateFamilyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (/permission|policy|row-level security|rls/i.test(raw))
    return 'مش معاك صلاحية لتنفيذ الإجراء ده'
  return 'حصلت مشكلة. حاول تاني'
}

export async function createDeferredFamily(
  form: DeferredFamilyForm,
  createdBy: string,
): Promise<number> {
  const s = (v: string) => v.trim() || null
  const { data, error } = await db
    .from('families')
    .insert({
      head_name: s(form.head_name),
      area: s(form.area),
      address: s(form.address),
      head_phone: s(form.head_phone),
      needs_raw: s(form.needs_raw),
      general_notes: s(form.general_notes),
      is_widow: form.is_widow,
      record_status: DEFERRED_STATUS,
      created_by: createdBy,
    })
    .select('family_id')
    .single()
  if (error) throw new Error(translateFamilyError(error))
  return (data as { family_id: number }).family_id
}
