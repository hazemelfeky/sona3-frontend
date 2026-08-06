export interface DashboardConfig {
  title: string
  source: string // view name for the table
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
  type: 'select' | 'boolean' | 'dateRange'
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
}

export const dashboards: Record<string, DashboardConfig> = {
  families: {
    title: 'الأسر',
    source: 'v_families_list',
    defaultSort: { key: 'head_name', dir: 'asc' },
    search: ['head_name', 'area', 'needs_raw'],
    filters: [
      { key: 'area', label: 'المنطقة', type: 'select' },
      { key: 'evaluation_status', label: 'الحالة', type: 'select' },
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
      { type: 'bar', title: 'الاحتياجات الأكثر تكراراً', source: 'v_chart_needs_distribution', span: 2 },
      { type: 'pie', title: 'الأسر حسب المنطقة', source: 'v_chart_families_by_area', span: 1 },
    ],
  },
}

export interface NavEntry {
  label: string
  icon: string
  slug?: string
  disabled?: boolean
  children?: NavEntry[]
}

export const nav: NavEntry[] = [
  {
    label: 'الأسر',
    icon: 'i-lucide-home',
    slug: 'families',
  },
  {
    label: 'المتطوعون',
    icon: 'i-lucide-users',
    disabled: true,
  },
  {
    label: 'الشؤون المالية',
    icon: 'i-lucide-wallet',
    disabled: true,
  },
]
