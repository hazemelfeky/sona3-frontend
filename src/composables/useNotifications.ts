import { db } from '@/lib/supabase'
import { useStore } from '@/store'

// VAPID public key (base64url). Put it in `.env` as VITE_VAPID_PUBLIC_KEY —
// must be the SAME pair whose private key is the VAPID_PRIVATE_KEY secret of
// the `send-push` Edge Function. The private key never ships to the client.
export const VAPID_PUBLIC_KEY: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 'PUT_YOUR_VAPID_PUBLIC_KEY_HERE'

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

/** Current device's push subscription, if any. */
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** Subscribe this device and store it in `push_subscriptions` for the signed-in user. */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('الإشعارات الفورية غير مدعومة هنا. على الآيفون لازم تثبّت التطبيق على الشاشة الرئيسية الأول')
  }
  const userId = useStore().userId
  if (!userId) throw new Error('لازم تسجّل دخول الأول')

  await ensurePermission()

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // required by Chrome and Safari
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('اشتراك الإشعارات غير صالح')

  // RLS: user can only write rows where user_id = auth.uid().
  const { error } = await db
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    )
  if (error) throw new Error('تعذّر حفظ الاشتراك في الإشعارات')

  return subscription
}

/** Unsubscribe this device and delete its row. Never throws on "already gone". */
export async function unsubscribeFromPush() {
  const subscription = await getCurrentSubscription()
  if (!subscription) return

  const { error } = await db.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
  if (error) throw new Error('تم إلغاء الإشعارات على الجهاز، بس حصلت مشكلة في حذف الاشتراك')
}

// Sending happens in the `send-push` Supabase Edge Function (admin only).
