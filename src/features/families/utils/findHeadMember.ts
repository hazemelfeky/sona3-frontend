import type { Database } from '@/types/db'

type Family = Database['public']['Tables']['families']['Row']
type Member = Database['public']['Tables']['members']['Row']

// The head isn't reliably flagged — this app's own family form never creates
// a members row for the head (head_* fields live directly on `families`),
// but legacy imported rows sometimes have one. Prefer matching by name
// against the family's own head_name (both come from the same import row,
// so this is the more reliable signal); fall back to relation text.
export function findHeadMember(family: Family, members: Member[]): Member | undefined {
  const familyMembers = members.filter((m) => m.family_id === family.family_id)

  const byName = familyMembers.find(
    (m) => m.name && family.head_name && m.name.trim() === family.head_name!.trim(),
  )
  if (byName) return byName

  return familyMembers.find((m) => (m.relation ?? '').includes('رب الأسرة'))
}
