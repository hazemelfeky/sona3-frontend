export interface NavEntry {
  label: string
  icon: string
  to?: string // route path
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
    to: '/families',
    requiresPerm: 'families.view',
  },
  {
    label: 'المتطوعون',
    icon: 'i-lucide-users',
    to: '/volunteers',
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
