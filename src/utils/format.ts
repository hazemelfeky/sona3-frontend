// numberingSystem: 'latn' forces Western digits — ar-EG's default is Arabic-Indic.
const moneyFormatter = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
  numberingSystem: 'latn',
})
const numberFormatter = new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' })
// en-CA formats as YYYY-MM-DD natively.
const dateFormatter = new Intl.DateTimeFormat('en-CA', { numberingSystem: 'latn' })
// en-GB formats as DD/MM/YYYY natively.
const dateFormatterDMY = new Intl.DateTimeFormat('en-GB', { numberingSystem: 'latn' })

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  electricity: 'كهرباء',
  water: 'مياه',
  gas: 'غاز',
  food: 'أكل',
  transport: 'مواصلات',
  rent: 'إيجار',
  internet: 'نت',
  education: 'تعليم',
  medical: 'علاج',
  other: 'أخرى',
}

export function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isNaN(n) ? '—' : moneyFormatter.format(n)
}

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isNaN(n) ? '—' : numberFormatter.format(n)
}

export function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d)
}

export function formatDateDMY(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatterDMY.format(d)
}

export function formatBool(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return value ? 'نعم' : 'لا'
}

// Egyptian mobiles are stored as 11 digits starting with 0 (e.g. 01012345678).
// Some source rows are missing the leading zero — add it back.
export function normalizeEgyptPhone(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`
  return digits || '—'
}

export function formatExpenseCategory(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return EXPENSE_CATEGORY_LABELS[String(value)] ?? String(value)
}

export function formatValue(value: unknown, format?: 'money' | 'number' | 'date' | 'bool' | 'badge'): string {
  switch (format) {
    case 'money':
      return formatMoney(value)
    case 'number':
      return formatNumber(value)
    case 'date':
      return formatDate(value)
    case 'bool':
      return formatBool(value)
    default:
      return value === null || value === undefined || value === '' ? '—' : String(value)
  }
}
