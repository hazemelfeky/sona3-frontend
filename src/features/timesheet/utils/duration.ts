// Duration is stored as a plain minutes integer; every display goes through
// here so hours/minutes splitting isn't re-derived per call site.
export function splitDuration(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes || 0))
  return { hours: Math.floor(safe / 60), minutes: safe % 60 }
}

// "2 س 30 د" — the س/د suffixes are the Arabic labels; digits stay Western
// to match the rest of the app (see utils/format.ts, which forces
// numberingSystem: 'latn' everywhere).
export function formatDuration(totalMinutes: number): string {
  const { hours, minutes } = splitDuration(totalMinutes)
  if (!hours && !minutes) return '0 د'
  const parts: string[] = []
  if (hours) parts.push(`${hours} س`)
  if (minutes) parts.push(`${minutes} د`)
  return parts.join(' ')
}

// Same as formatDuration but always shows hours, for totals ("12 س 5 د").
export function formatHours(totalMinutes: number): string {
  const { hours, minutes } = splitDuration(totalMinutes)
  return minutes ? `${hours} س ${minutes} د` : `${hours} س`
}
