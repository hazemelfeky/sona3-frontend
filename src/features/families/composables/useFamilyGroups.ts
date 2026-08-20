import { supabase } from '@/lib/supabase'

export interface FamilyGroupSummary {
  groupId: string
  name: string
  familyCount: number
  createdBy: string
  createdAt: string
}

export interface LoadedFamilyIds {
  familyIds: number[]
  skippedCount: number
}

// Shared by "load a saved group" and "restore last selection" — either
// source can name a family_id that's since been deleted (or, for a saved
// group, one RLS now hides from this viewer). Verify against `families`
// and drop what's missing instead of failing the whole load.
export async function verifyExistingFamilyIds(ids: number[]): Promise<LoadedFamilyIds> {
  if (ids.length === 0) return { familyIds: [], skippedCount: 0 }

  const { data, error } = await supabase.from('families').select('family_id').in('family_id', ids)
  if (error) throw error

  const existing = new Set((data ?? []).map((r) => r.family_id))
  const familyIds = ids.filter((id) => existing.has(id))
  return { familyIds, skippedCount: ids.length - familyIds.length }
}

export async function fetchFamilyGroups(): Promise<FamilyGroupSummary[]> {
  const [groupsRes, membersRes] = await Promise.all([
    supabase.from('family_groups').select('group_id,name,created_by,created_at').order('created_at', { ascending: false }),
    supabase.from('family_group_members').select('group_id'),
  ])
  if (groupsRes.error) throw groupsRes.error
  if (membersRes.error) throw membersRes.error

  const groups = groupsRes.data ?? []
  const members = membersRes.data ?? []

  const counts = new Map<string, number>()
  for (const m of members) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1)

  const creatorIds = Array.from(new Set(groups.map((g) => g.created_by)))
  const profilesRes = creatorIds.length
    ? await supabase.from('profiles').select('user_id,full_name,username').in('user_id', creatorIds)
    : { data: [], error: null }
  if (profilesRes.error) throw profilesRes.error

  const names = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p.full_name || p.username]))

  return groups.map((g) => ({
    groupId: g.group_id,
    name: g.name,
    familyCount: counts.get(g.group_id) ?? 0,
    createdBy: names.get(g.created_by) ?? '—',
    createdAt: g.created_at,
  }))
}

export async function saveFamilyGroup(name: string, familyIds: number[], createdBy: string): Promise<string> {
  const { data, error } = await supabase
    .from('family_groups')
    .insert({ name, created_by: createdBy })
    .select('group_id')
    .single()
  if (error) throw error
  const groupId = data.group_id

  if (familyIds.length > 0) {
    const rows = familyIds.map((family_id) => ({ group_id: groupId, family_id }))
    const { error: memberError } = await supabase.from('family_group_members').insert(rows)
    if (memberError) throw memberError
  }

  return groupId
}

export async function renameFamilyGroup(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.from('family_groups').update({ name }).eq('group_id', groupId)
  if (error) throw error
}

export async function deleteFamilyGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('family_groups').delete().eq('group_id', groupId)
  if (error) throw error
}

export async function loadFamilyGroupFamilyIds(groupId: string): Promise<LoadedFamilyIds> {
  const { data, error } = await supabase.from('family_group_members').select('family_id').eq('group_id', groupId)
  if (error) throw error

  const requested = (data ?? []).map((r) => r.family_id)
  return verifyExistingFamilyIds(requested)
}
