import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// Dashboard config drives table/view names at runtime (never user input), so a
// plain string can't satisfy the typed client's literal-key union. This alias
// intentionally drops that generic for config-driven queries only.
export const db = supabase as unknown as SupabaseClient

// Anonymous requests against a table/view with no matching RLS policy return
// an empty array, not an error — looks like a frontend bug when it isn't.
export function warnIfEmptyFromRls(source: string, isEmpty: boolean, hadError: boolean) {
  if (import.meta.env.DEV && isEmpty && !hadError) {
    console.warn(
      `[rls] "${source}" returned no rows with no error. If data is expected, check RLS policies for the anon role.`,
    )
  }
}

if (import.meta.env.DEV) (window as unknown as { supabase: typeof supabase }).supabase = supabase
