import type { DashboardConfig } from '@/components/list-page/types'

export const familiesListConfig: DashboardConfig = {
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
}
