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
