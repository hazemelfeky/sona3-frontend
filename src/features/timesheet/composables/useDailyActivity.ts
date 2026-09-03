import { db, warnIfEmptyFromRls } from '@/lib/supabase'

// timesheet_entries / v_timesheet_daily aren't in src/types/db.ts yet (run
// `pnpm gen:types` after the migration lands), so these go through the
// untyped `db` alias — same escape hatch the rest of the app uses for
// config-driven queries (see lib/supabase.ts).
export interface DailyActivityRow {
  user_id: string
  task_date: string // 'YYYY-MM-DD'
  task_count: number
  total_minutes: number
}

const DAILY_COLUMNS = 'user_id, task_date, task_count, total_minutes'

// Local-date key, never toISOString() — that shifts to UTC and would move a
// task recorded late in the evening onto the wrong grid cell.
export function toDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// The grid always covers the last 365 days, snapped back to the Sunday that
// starts the earliest week so every column holds a full Sun..Sat run.
export function gridRange(today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - 364)
  start.setDate(start.getDate() - start.getDay())
  return { start, end }
}

export async function fetchDailyActivity(
  userId: string,
  since: string,
): Promise<DailyActivityRow[]> {
  const { data, error } = await db
    .from('v_timesheet_daily')
    .select(DAILY_COLUMNS)
    .eq('user_id', userId)
    .gte('task_date', since)
  if (error) throw new Error('حصلت مشكلة أثناء تحميل النشاط')
  const rows = (data ?? []) as DailyActivityRow[]
  warnIfEmptyFromRls('v_timesheet_daily', rows.length === 0, false)
  return rows
}

// One query for every user the viewer is allowed to see — RLS on the view
// does the filtering, so this is only reachable with timesheet.view_all.
export async function fetchAllDailyActivity(since: string): Promise<DailyActivityRow[]> {
  const { data, error } = await db
    .from('v_timesheet_daily')
    .select(DAILY_COLUMNS)
    .gte('task_date', since)
  if (error) throw new Error('حصلت مشكلة أثناء تحميل النشاط')
  return (data ?? []) as DailyActivityRow[]
}
