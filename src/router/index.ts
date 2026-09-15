import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useStore } from '@/store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/auth', redirect: '/auth/login' },
    { path: '/notifications', redirect: '/notifications/send' },
    ...setupLayouts(routes as RouteRecordRaw[]),
  ],
})

const AUTH_ENTRY_PAGES = ['/auth/login', '/auth/register']

router.beforeEach(async (to) => {
  const store = useStore()
  if (!store.initialized) await store.init()

  if (!store.isAuthenticated) {
    return AUTH_ENTRY_PAGES.includes(to.path) ? true : '/auth/login'
  }

  if (store.status === 'pending' && to.path !== '/auth/pending') return '/auth/pending'
  if (store.status === 'rejected' && to.path !== '/auth/rejected') return '/auth/rejected'
  if (store.status === 'approved' && (AUTH_ENTRY_PAGES.includes(to.path) || to.path === '/auth/pending' || to.path === '/auth/rejected')) {
    return '/dashboard'
  }

  // UX-level gate only — the DB (RLS + rpc checks) is the real enforcement,
  // this just avoids sending someone straight to a page that will only
  // ever show them empty/rejected results. The permission itself lives on
  // the route definition (`<route>` meta block) — never re-checked ad hoc
  // inside a page component.
  // A list of codes means any one of them is enough, not all of them.
  const routePerm = to.meta.requiresPerm as string | string[] | undefined
  if (routePerm && !store.hasAnyPerm(routePerm)) return '/dashboard'

  return true
})

export default router
