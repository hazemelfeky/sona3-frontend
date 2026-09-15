export interface NavEntry {
  label: string
  icon: string
  to?: string // route path
  disabled?: boolean
  children?: NavEntry[]
  // Hidden unless the current user holds this permission (UX only — DB still
  // enforces). A list means any one of the codes is enough.
  requiresPerm?: string | string[]
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
    label: 'تايم شيت',
    icon: 'i-lucide-clock',
    to: '/timesheet',
  },
  {
    label: 'تايم شيت الكل',
    icon: 'i-lucide-calendar-clock',
    to: '/timesheet/all',
    requiresPerm: 'timesheet.view_all',
  },
  {
    label: 'التنفيذات',
    icon: 'i-lucide-hand-heart',
    to: '/aid',
    requiresPerm: ['operations.view', 'operations.manage'],
  },
  {
    label: 'المخزون',
    icon: 'i-lucide-package',
    to: '/stock',
    requiresPerm: ['operations.view', 'operations.manage'],
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
  {
    label: 'الإشعارات',
    icon: 'i-lucide-bell-ring',
    to: '/notifications',
    requiresPerm: 'notifications.send',
  },
]
