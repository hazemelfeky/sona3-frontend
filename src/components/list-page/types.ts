export interface DashboardConfig {
  title: string
  source: string // view name for the table
  requiresPerm?: string // hidden/redirected unless the current user holds this permission
  fixedFilter?: Record<string, unknown> // always-applied filter (not user-editable)
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  search?: string[] // columns included in text search
  filters?: FilterDef[] // user-facing filter controls
  columns: ColumnDef[]
  stats?: { source: string; cards: CardDef[] }
  charts?: ChartDef[]
  rowClass?: (row: Record<string, unknown>) => string
}

export interface ColumnDef {
  key: string
  label: string // Arabic header
  format?: 'money' | 'number' | 'date' | 'bool' | 'badge'
  sortable?: boolean // default true
  // Free-text columns only: clip to one line so a long value can't stretch
  // the row, with the full text kept in the cell's title tooltip.
  truncate?: boolean
}

export interface FilterDef {
  key: string
  label: string
  // 'contains' has no input control of its own in FilterBar — it's set by
  // clicking a chart (see ChartDef.filterKey) and shown as a dismissible
  // chip, matched with ilike rather than an exact eq().
  type: 'select' | 'boolean' | 'dateRange' | 'contains'
  options?: { label: string; value: unknown }[] // if omitted, derive distinct values from data
}

export interface CardDef {
  key: string // column in the stats view
  label: string
  format?: 'money' | 'number'
  icon?: string // e.g. 'i-lucide-home'
  color?: string | ((v: unknown) => string) // static, or conditional on the value
}

export interface ChartDef {
  type: 'bar' | 'line' | 'pie' | 'donut'
  title: string
  source: string // view returning label/value[/series]
  format?: 'money' | 'number'
  grouped?: boolean // true when the view has a `series` column
  span?: 1 | 2 // grid width
  // Clicking a slice/bar sets filters[filterKey] to the clicked label —
  // must match a key in this dashboard's `filters`.
  filterKey?: string
}
