/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa `injectManifest` strategy).
// Kept as plain JS so it stays out of the app's DOM-typed vue-tsc build.

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

const THEME_COLOR = '#12385D'
const ICON = '/pwa-192x192.png'
const BADGE = '/pwa-maskable-192x192.png'
const DEFAULT_TITLE = 'صنّاع الحياة'

// ---------------------------------------------------------------------------
// App shell caching — mirrors what generateSW used to do.
// ---------------------------------------------------------------------------

// registerType is 'autoUpdate': a new build must take over immediately.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback. /api and Supabase never get index.html; every
// other non-navigation request (incl. all Supabase data/auth calls) isn't
// routed at all, so it goes straight to the network.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/, /supabase/],
  }),
)

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

// Expected payload (sent by the server — not part of this repo):
//   { "title": "...", "body": "...", "url": "/families/12", "tag": "aid-12" }
self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = payload.title || DEFAULT_TITLE
  const options = {
    body: payload.body || '',
    icon: payload.icon || ICON,
    badge: BADGE,
    dir: 'rtl',
    lang: 'ar',
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/', themeColor: THEME_COLOR },
  }

  // iOS/Safari revokes the subscription if a push doesn't end in a visible
  // notification, so always show one — even for an empty payload.
  event.waitUntil(self.registration.showNotification(title, options))
})

// ---------------------------------------------------------------------------
// Notification click → focus an open window or open the app.
// ---------------------------------------------------------------------------

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin)

      if (client) {
        await client.focus()
        if (client.url !== target && 'navigate' in client) {
          try {
            await client.navigate(target)
          } catch {
            // Uncontrolled clients can't be navigated; focusing is enough.
          }
        }
        return
      }

      await self.clients.openWindow(target)
    })(),
  )
})

// TODO(server): handle `pushsubscriptionchange` once the backend can accept a
// replacement subscription (re-subscribe here and POST to /api/save-subscription).
