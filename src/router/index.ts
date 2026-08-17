import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useStore } from '@/store'
import { dashboards } from '@/config/dashboards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/auth', redirect: '/auth/login' },
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
  // the route definition (`<route>` meta block) or, for the generic
  // /dashboards/:slug route, on the matching DashboardConfig — never
  // re-checked ad hoc inside a page component.
  const routePerm = to.meta.requiresPerm as string | undefined
  if (routePerm && !store.hasPerm(routePerm)) return '/dashboard'

  const slugMatch = to.path.match(/^\/dashboards\/([^/]+)/)
  const dashboardPerm = slugMatch ? dashboards[slugMatch[1]!]?.requiresPerm : undefined
  if (dashboardPerm && !store.hasPerm(dashboardPerm)) return '/dashboard'

  return true
})

export default router
