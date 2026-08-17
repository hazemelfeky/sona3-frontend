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

export const dashboards: Record<string, DashboardConfig> = {
  families: {
    title: 'الأسر',
    source: 'v_families_list',
    requiresPerm: 'families.view',
    defaultSort: { key: 'head_name', dir: 'asc' },
    search: ['head_name', 'area', 'needs_raw', 'family_code'],
    filters: [
      { key: 'area', label: 'المنطقة', type: 'select' },
      { key: 'evaluation_status', label: 'الحالة', type: 'select' },
      { key: 'needs_labels', label: 'الاحتياج', type: 'contains' },
    ],
    columns: [
      { key: 'head_name', label: 'رب الأسرة' },
      { key: 'area', label: 'المنطقة' },
      { key: 'member_count', label: 'عدد الأفراد', format: 'number' },
      { key: 'needs_labels', label: 'الاحتياجات' },
      { key: 'needs_count', label: 'عدد الاحتياجات', format: 'number' },
      { key: 'evaluation_status', label: 'التقييم', format: 'badge' },
    ],
    stats: {
      source: 'v_families_stats',
      cards: [
        { key: 'total_families', label: 'إجمالي الأسر', format: 'number', icon: 'i-lucide-home' },
        { key: 'accepted_families', label: 'أسر مقبولة', format: 'number', icon: 'i-lucide-check-circle' },
        { key: 'rejected_families', label: 'أسر مرفوضة', format: 'number', icon: 'i-lucide-x-circle' },
        { key: 'pending_families', label: 'أسر مؤجلة', format: 'number', icon: 'i-lucide-clock' },
        { key: 'areas_count', label: 'عدد المناطق', format: 'number', icon: 'i-lucide-map-pin' },
        {
          key: 'families_with_needs',
          label: 'أسر لها احتياجات',
          format: 'number',
          icon: 'i-lucide-clipboard-list',
        },
      ],
    },
    charts: [
      {
        type: 'bar',
        title: 'الاحتياجات الأكثر تكراراً',
        source: 'v_chart_needs_distribution',
        span: 2,
        filterKey: 'needs_labels',
      },
      {
        type: 'pie',
        title: 'الأسر حسب المنطقة',
        source: 'v_chart_families_by_area',
        span: 1,
        filterKey: 'area',
      },
    ],
  },
}

export interface NavEntry {
  label: string
  icon: string
  slug?: string
  to?: string // direct route, overrides the /dashboards/{slug} default
  disabled?: boolean
  children?: NavEntry[]
  requiresPerm?: string // hidden unless the current user holds this permission (UX only — DB still enforces)
}

export const nav: NavEntry[] = [
  {
    label: 'الرئيسية',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
  },
  {
    label: 'الأسر',
    icon: 'i-lucide-home',
    slug: 'families',
    requiresPerm: 'families.view',
  },
  {
    label: 'المتطوعون',
    icon: 'i-lucide-users',
    disabled: true,
    requiresPerm: 'users.view',
  },
  {
    label: 'الشؤون المالية',
    icon: 'i-lucide-wallet',
    disabled: true,
    requiresPerm: 'finance.view',
  },
  {
    label: 'الصلاحيات',
    icon: 'i-lucide-shield-check',
    to: '/permissions',
    requiresPerm: 'users.permissions',
  },
]
