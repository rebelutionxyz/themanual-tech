import { supabase } from './supabase';

/**
 * Web push registration (off-site incoming-call alerts).
 *
 *  - `registerPush()` — silent: registers the service worker, and if permission
 *    is already granted, (re)subscribes and saves the subscription. Safe to call
 *    on every sign-in.
 *  - `enablePush()` — call from a user gesture (a button): asks permission, then
 *    subscribes + saves.
 *
 * The push itself is sent by the `push-send` edge function when a call starts.
 * iOS Safari only delivers web push when the site is installed to the home
 * screen (PWA); desktop + Android work in a background browser.
 */

// Public VAPID key — safe to ship in the client (matches the private key set as
// a Supabase secret for the push-send function).
const VAPID_PUBLIC_KEY =
  'BHKzadWcicmBmyRYqX_gaJdBo1EUkG8qgithSoh2jutUTrkLqSfNCXm8DanoiFMFmYQcOiVCJXFUbNBu807o0l0';

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
