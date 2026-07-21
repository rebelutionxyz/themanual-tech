/* COMMS push service worker.
 * Shows an incoming-call notification when the app isn't focused, and
 * focuses/opens the call on click. When a tab is already visible, the in-app
 * ring handles it, so the push notification is suppressed (no double alert). */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    /* non-JSON payload */
  }
  const title = data.title || 'Incoming call';
  const body = data.body || '';
  const url = data.url || '/comms';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = windows.some((c) => c.focused || c.visibilityState === 'visible');
      if (focused) return; // the on-site ring is already handling it
      await self.registration.showNotification(title, {
        body,
        tag: 'comms-call',
        renotify: true,
        requireInteraction: true,
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/comms';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of windows) {
        if ('focus' in c) {
          await c.focus();
          if ('navigate' in c) {
            try {
              await c.navigate(url);
            } catch (_) {
              /* cross-origin or unsupported */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
