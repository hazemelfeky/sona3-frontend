// Per-browser shortcut for "I just built a sheet, let me pick the same
// families again" — deliberately not synced anywhere, see sheet-builder page.
const STORAGE_KEY = 'sona3:lastFamilySelection'

export interface StoredSelection {
  familyIds: number[]
  savedAt: string
}

export function saveLastSelection(familyIds: number[]): void {
  const payload: StoredSelection = { familyIds, savedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function readLastSelection(): StoredSelection | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredSelection
    if (!Array.isArray(parsed.familyIds) || typeof parsed.savedAt !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
