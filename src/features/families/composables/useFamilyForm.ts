import type { Database } from '@/types/db'
import type { FamilyPayload, MemberPayload } from './useFamilyMutations'

type FamilyRow = Database['public']['Tables']['families']['Row']
type MemberRow = Database['public']['Tables']['members']['Row']
type FamilyNeedRow = Database['public']['Tables']['family_needs']['Row']

export const NEED_STATUS_OPTIONS = ['مقبولة', 'مرفوضة', 'معتمدة', 'تم التنفيذ'] as const
export type NeedStatus = (typeof NEED_STATUS_OPTIONS)[number]
// Default for a catalog need the family hasn't been evaluated for yet —
// every catalog code still gets a row once saved, so it needs some status.
export const NEED_STATUS_DEFAULT: NeedStatus = 'مرفوضة'
export const NEED_STATUS_ACCEPTED: NeedStatus = 'مقبولة'
// The catalog's own "أخرى" entry — its status isn't picked from the select
// (hidden for this one code in FamilyForm.vue); it's derived from whether
// otherNeedNote has text, and that text is this row's `note`.
export const NEED_OTHER_CODE = 'other'

// Same plain-string-until-submit shape as FamilyFormState. `member_id` is
// absent for a row added in the form (not yet saved) — that's how
// saveFamilyMembers tells inserts from updates apart.
export interface MemberFormState {
  member_id?: number
  name: string
  age: string
  relation: string
  is_working: boolean
  education_level: string
  education_monthly_cost: string
  notes: string
}

export function emptyMemberForm(): MemberFormState {
  return {
    name: '',
    age: '',
    relation: '',
    is_working: false,
    education_level: '',
    education_monthly_cost: '',
    notes: '',
  }
}

function memberToForm(row: MemberRow): MemberFormState {
  const s = (v: string | null) => v ?? ''
  const n = (v: number | null) => (v === null ? '' : String(v))
  return {
    member_id: row.member_id,
    name: s(row.name),
    age: n(row.age),
    relation: s(row.relation),
    is_working: row.is_working ?? false,
    education_level: s(row.education_level),
    education_monthly_cost: n(row.education_monthly_cost),
    notes: s(row.notes),
  }
}

export function memberFormToPayload(form: MemberFormState): MemberPayload {
  const s = (v: string) => v.trim() || null
  const n = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    name: s(form.name),
    age: n(form.age),
    relation: s(form.relation),
    is_working: form.is_working,
    education_level: s(form.education_level),
    education_monthly_cost: n(form.education_monthly_cost),
    notes: s(form.notes),
  }
}

// Every field is a plain string in the form (inputs are strings), converted
// to the right null/number shape only at submit time via formToPayload.
export interface FamilyFormState {
  area: string
  address: string
  registration_date: string
  head_name: string
  head_age: string
  head_phone: string
  head_occupation: string
  head_education: string
  head_status: string
  head_notes: string
  spouse_name: string
  spouse_age: string
  spouse_phone: string
  spouse_occupation: string
  spouse_education: string
  spouse_status: string
  spouse_notes: string
  housing_type: string
  housing_condition_notes: string
  blanket_count: string
  declared_income: string
  declared_expenses: string
  deficit_note: string
  deficit_coping: string
  evaluation_status: string
  confidence: string
  general_notes: string
  members: MemberFormState[]
  // Status per catalog need_type code (see NEED_STATUS_OPTIONS) — every
  // catalog code gets a row once saved, defaulting to NEED_STATUS_DEFAULT
  // until explicitly changed. The NEED_OTHER_CODE entry's status is instead
  // derived from otherNeedNote at save time (see saveFamilyNeeds).
  needStatus: Record<string, NeedStatus>
  otherNeedNote: string
}

export function emptyFamilyForm(): FamilyFormState {
  return {
    area: '',
    address: '',
    registration_date: '',
    head_name: '',
    head_age: '',
    head_phone: '',
    head_occupation: '',
    head_education: '',
    head_status: '',
    head_notes: '',
    spouse_name: '',
    spouse_age: '',
    spouse_phone: '',
    spouse_occupation: '',
    spouse_education: '',
    spouse_status: '',
    spouse_notes: '',
    housing_type: '',
    housing_condition_notes: '',
    blanket_count: '',
    declared_income: '',
    declared_expenses: '',
    deficit_note: '',
    deficit_coping: '',
    evaluation_status: '',
    confidence: '',
    general_notes: '',
    members: [],
    needStatus: {},
    otherNeedNote: '',
  }
}

function toNeedStatus(status: string | null): NeedStatus {
  return (NEED_STATUS_OPTIONS as readonly string[]).includes(status ?? '') ? (status as NeedStatus) : NEED_STATUS_DEFAULT
}

export function familyToForm(
  row: FamilyRow,
  members: MemberRow[] = [],
  needs: FamilyNeedRow[] = [],
): FamilyFormState {
  const s = (v: string | null) => v ?? ''
  const n = (v: number | null) => (v === null ? '' : String(v))
  return {
    area: s(row.area),
    address: s(row.address),
    registration_date: s(row.registration_date),
    head_name: s(row.head_name),
    head_age: n(row.head_age),
    head_phone: s(row.head_phone),
    head_occupation: s(row.head_occupation),
    head_education: s(row.head_education),
    head_status: s(row.head_status),
    head_notes: s(row.head_notes),
    spouse_name: s(row.spouse_name),
    spouse_age: n(row.spouse_age),
    spouse_phone: s(row.spouse_phone),
    spouse_occupation: s(row.spouse_occupation),
    spouse_education: s(row.spouse_education),
    spouse_status: s(row.spouse_status),
    spouse_notes: s(row.spouse_notes),
    housing_type: s(row.housing_type),
    housing_condition_notes: s(row.housing_condition_notes),
    blanket_count: n(row.blanket_count),
    declared_income: n(row.declared_income),
    declared_expenses: n(row.declared_expenses),
    deficit_note: s(row.deficit_note),
    deficit_coping: s(row.deficit_coping),
    evaluation_status: s(row.evaluation_status),
    confidence: s(row.confidence),
    general_notes: s(row.general_notes),
    members: members.map(memberToForm),
    needStatus: Object.fromEntries(
      needs.filter((need) => need.need_code !== null).map((need) => [need.need_code!, toNeedStatus(need.status)]),
    ),
    otherNeedNote: needs.find((need) => need.need_code === NEED_OTHER_CODE)?.note ?? '',
  }
}

// Family-level fields only — members live in a separate table and are
// synced independently via saveFamilyMembers.
export function formToPayload(form: FamilyFormState): FamilyPayload {
  const s = (v: string) => v.trim() || null
  const n = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    area: s(form.area),
    address: s(form.address),
    registration_date: s(form.registration_date),
    head_name: s(form.head_name),
    head_age: n(form.head_age),
    head_phone: s(form.head_phone),
    head_occupation: s(form.head_occupation),
    head_education: s(form.head_education),
    head_status: s(form.head_status),
    head_notes: s(form.head_notes),
    spouse_name: s(form.spouse_name),
    spouse_age: n(form.spouse_age),
    spouse_phone: s(form.spouse_phone),
    spouse_occupation: s(form.spouse_occupation),
    spouse_education: s(form.spouse_education),
    spouse_status: s(form.spouse_status),
    spouse_notes: s(form.spouse_notes),
    housing_type: s(form.housing_type),
    housing_condition_notes: s(form.housing_condition_notes),
    blanket_count: n(form.blanket_count),
    declared_income: n(form.declared_income),
    declared_expenses: n(form.declared_expenses),
    deficit_note: s(form.deficit_note),
    deficit_coping: s(form.deficit_coping),
    evaluation_status: s(form.evaluation_status),
    confidence: s(form.confidence),
    general_notes: s(form.general_notes),
  }
}
