import { supabase } from './supabase';

/**
 * Web push registration (off-site incoming-call alerts).
 *
 *  - `registerPush()` — silent: registers the service worker, and if permission
 *    is already granted, (re)subscribes and saves the subscription. Safe to call
 *    on every sign-in.
 *  - `enablePush()` — call from a user gesture (a button): asks permission, then
 *    subscribes + saves.
 *  - `showCallNotification()` / `clearCallNotifications()` — fire an OS-level
 *    notification (bottom-right of the screen, outside the browser) directly from
 *    the open app, for when COMMS is open but not the focused tab. The
 *    fully-closed case is covered by web push via the service worker.
 *
 * The push itself is sent by the `push-send` edge function when a call starts.
 * iOS Safari only delivers web push — and shows app notifications — when the
 * site is installed to the home screen (PWA); desktop + Android work in a
 * background browser.
 */

// Public VAPID key — safe to ship in the client (matches the private key set as
// a Supabase secret for the push-send function).
const VAPID_PUBLIC_KEY =
  'BHKzadWcicmBmyRYqX_gaJdBo1EUkG8qgithSoh2jutUTrkLqSfNCXm8DanoiFMFmYQcOiVCJXFUbNBu807o0l0';

const CALL_TAG = 'comms-call';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

async function registerSw(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  if (!supabase) return;
  const json = sub.toJSON();
  const keys = json.keys ?? {};
  await supabase.rpc('comms_push_subscribe', {
    p_endpoint: sub.endpoint,
    p_p256dh: keys.p256dh ?? '',
    p_auth: keys.auth ?? '',
    p_ua: navigator.userAgent,
  });
}

/** Silent: register the SW and, if already permitted, (re)subscribe + save. */
export async function registerPush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await registerSw();
  if (!reg || Notification.permission !== 'granted') return;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));
  await saveSubscription(sub);
}

/** User-gesture entry point: ask permission, then subscribe + save. */
export async function enablePush(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await registerPush();
  return perm;
}

/**
 * Show an OS-level incoming-call notification (bottom-right on Windows, top-right
 * on macOS) directly from the running app. Use when COMMS is open but not the
 * focused tab, so the Bee is alerted even while looking at another app. No-op
 * without notification permission or an active service worker.
 */
export async function showCallNotification(title: string, body: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // `renotify` is valid at runtime but missing from TS's NotificationOptions.
    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      tag: CALL_TAG,
      renotify: true,
      requireInteraction: true,
      data: { url: '/comms' },
    };
    await reg.showNotification(title, options);
  } catch {
    /* best-effort — an OS notification is a nice-to-have on top of the in-app ring */
  }
}

/** Dismiss any incoming-call OS notification (answered / declined / missed). */
export async function clearCallNotifications(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const open = await reg.getNotifications({ tag: CALL_TAG });
    for (const n of open) n.close();
  } catch {
    /* best-effort */
  }
}
