import type { DashboardConfig } from '@/components/list-page/types'

// Needs options come from need_types (a small reference table) rather than
// being derived from v_families_list like area/evaluation_status are —
// needs_labels is a concatenated string per family, so distinct values on
// it would be label *combinations*, not individual needs.
export function buildSheetBuilderConfig(
  needsOptions: { label: string; value: string | null }[],
): DashboardConfig {
  return {
    title: 'بناء شيت',
    source: 'v_families_list',
    requiresPerm: 'families.execute',
    // An unresearched draft has nothing to distribute against — it must not
    // reach a sheet.
    fixedFilter: { record_status: 'active' },
    defaultSort: { key: 'head_name', dir: 'asc' },
    search: ['search_text'],
    filters: [
      { key: 'area', label: 'المنطقة', type: 'select' },
      { key: 'evaluation_status', label: 'الحالة', type: 'select' },
      { key: 'needs_labels', label: 'الاحتياج', type: 'contains', options: needsOptions },
    ],
    columns: [
      { key: 'head_name', label: 'رب الأسرة' },
      { key: 'area', label: 'المنطقة' },
      { key: 'member_count', label: 'عدد الأفراد', format: 'number' },
      { key: 'needs_labels', label: 'الاحتياجات' },
      { key: 'evaluation_status', label: 'التقييم', format: 'badge' },
    ],
  }
}
