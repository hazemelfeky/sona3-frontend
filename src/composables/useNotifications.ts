import { supabase } from '@/lib/supabase'

// VAPID public key (base64url) — generate the pair on the server side
// (e.g. `npx web-push generate-vapid-keys`) and put ONLY the public key here
// or in `.env` as VITE_VAPID_PUBLIC_KEY. The private key never ships to the client.
export const VAPID_PUBLIC_KEY: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 'PUT_YOUR_VAPID_PUBLIC_KEY_HERE'

const SAVE_SUBSCRIPTION_URL = '/api/save-subscription'

const ICON = '/pwa-192x192.png'
const BADGE = '/pwa-maskable-192x192.png'

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

// iOS (16.4+) exposes Notification/PushManager only inside an installed
// (home-screen) PWA, so these are false in plain Safari tabs.
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function isPushSupported() {
  return isNotificationSupported() && 'PushManager' in window
}

// Must be called from a user gesture (button click) — iOS rejects it otherwise.
async function ensurePermission() {
  if (!isNotificationSupported()) throw new Error('الإشعارات غير مدعومة على هذا الجهاز أو المتصفح')
  if (Notification.permission === 'granted') return
  if (Notification.permission === 'denied') {
    throw new Error('تم رفض إذن الإشعارات، فعّله من إعدادات المتصفح')
  }
  const result = await Notification.requestPermission()
  if (result !== 'granted') throw new Error('لم يتم منح إذن الإشعارات')
}

/** Local notification while the app is open (goes through the SW so it works on mobile too). */
export async function showLocalNotification(title: string, options: NotificationOptions & { url?: string } = {}) {
  await ensurePermission()
  const registration = await navigator.serviceWorker.ready
  const { url, ...rest } = options
  await registration.showNotification(title, {
    icon: ICON,
    badge: BADGE,
    dir: 'rtl',
    lang: 'ar',
    ...rest,
    data: { url: url ?? '/', ...(rest.data ?? {}) },
  })
}

/** Subscribe to Web Push and hand the subscription to the backend. */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('الإشعارات الفورية غير مدعومة هنا. على الآيفون لازم تثبّت التطبيق على الشاشة الرئيسية الأول')
  }
  await ensurePermission()

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // required by Chrome and Safari
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // Lets the server tie the subscription to the signed-in user.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(SAVE_SUBSCRIPTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!res.ok) throw new Error('تعذّر حفظ الاشتراك في الإشعارات')

  return subscription
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  await subscription?.unsubscribe()
  // TODO(server): tell the backend to delete this subscription as well.
}

// Sending the push itself happens server-side (web-push + VAPID private key)
// and is intentionally not part of this frontend repo.
