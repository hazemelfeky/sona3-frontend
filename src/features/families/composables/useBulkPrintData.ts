import { supabase } from '@/lib/supabase'
import { normalizeEgyptPhone } from '@/utils/format'
import { findHeadMember } from '@/features/families/utils/findHeadMember'
import type { Database } from '@/types/db'

type Family = Database['public']['Tables']['families']['Row']
type Member = Database['public']['Tables']['members']['Row']

export interface BulkPrintFamily {
  familyId: number
  name: string
  phone: string
  nationalId: string
}

// One round trip for families, one for their members — never one query per
// family. Fifty families must not produce fifty requests.
export async function fetchBulkPrintFamilies(familyIds: number[]): Promise<BulkPrintFamily[]> {
  if (familyIds.length === 0) return []

  const [familiesRes, membersRes] = await Promise.all([
    supabase.from('families').select('*').in('family_id', familyIds),
    supabase.from('members').select('*').in('family_id', familyIds),
  ])

  if (familiesRes.error) throw familiesRes.error
  if (membersRes.error) throw membersRes.error

  const families = (familiesRes.data as Family[]) ?? []
  const members = (membersRes.data as Member[]) ?? []

  return families.map((f) => {
    const phone = f.head_phone ? normalizeEgyptPhone(f.head_phone) : ''
    return {
      familyId: f.family_id,
      name: f.head_name ?? '',
      phone: phone === '—' ? '' : phone,
      nationalId: findHeadMember(f, members)?.id_number ?? '',
    }
  })
}

export interface ExecutionSheetFamily {
  area: string
  headName: string
  headPhone: string
  spouseName: string
  memberCount: number | null
}

// شيت تنفيذ — a plain CSV export, no member lookup needed (unlike the
// printed sheets above, which need each family's head member for a
// national id column this one doesn't have).
export async function fetchExecutionSheetFamilies(familyIds: number[]): Promise<ExecutionSheetFamily[]> {
  if (familyIds.length === 0) return []

  const { data, error } = await supabase
    .from('families')
    .select('area, head_name, head_phone, spouse_name, member_count')
    .in('family_id', familyIds)
  if (error) throw error

  return (data ?? []).map((f) => {
    const phone = f.head_phone ? normalizeEgyptPhone(f.head_phone) : ''
    return {
      area: f.area ?? '',
      headName: f.head_name ?? '',
      headPhone: phone === '—' ? '' : phone,
      spouseName: f.spouse_name ?? '',
      memberCount: f.member_count,
    }
  })
}
