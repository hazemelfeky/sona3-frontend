import type { ColumnDef, DashboardConfig } from '@/components/list-page/types'

// Deferred (record_status 'draft') families are captures, not research: the
// normal list's evaluation/needs columns are empty or zero for every one of
// them, so the deferred mode swaps in the handful of fields that are
// actually filled at capture time.
//
// head_phone and created_at belong here too, but v_families_list doesn't
// select them (confirmed against the API: 42703 for both) and the list
// reads that view with select('*'). Adding `f.head_phone, f.created_at` to
// the view — both already exist on families — is all it takes for the two
// commented-out columns below to start working.
export const deferredListColumns: ColumnDef[] = [
  { key: 'head_name', label: 'رب الأسرة' },
  { key: 'area', label: 'المنطقة' },
  // { key: 'head_phone', label: 'الموبايل', sortable: false },
  { key: 'needs_raw', label: 'الاحتياج', sortable: false, truncate: true },
  // { key: 'created_at', label: 'تاريخ الإضافة', format: 'date' },
]

export const familiesListConfig: DashboardConfig = {
  title: 'الأسر',
  source: 'v_families_list',
  requiresPerm: 'families.view',
  // Deferred families (record_status 'draft') are unresearched captures and
  // must never sit mixed into the normal list. The families page flips this
  // to 'draft' to show them on their own.
  fixedFilter: { record_status: 'active' },
  defaultSort: { key: 'head_name', dir: 'asc' },
  search: ['search_text'],
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
      {
        key: 'accepted_families',
        label: 'أسر مقبولة',
        format: 'number',
        icon: 'i-lucide-check-circle',
      },
      {
        key: 'rejected_families',
        label: 'أسر مرفوضة',
        format: 'number',
        icon: 'i-lucide-x-circle',
      },
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
}
