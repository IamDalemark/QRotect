// Retirement worker for browsers with QROTECT's previous worker installed.
// New pages never register it. It has no fetch handler or offline fallback.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await Promise.all(
          (await caches.keys()).map(async (name) => {
            if (name === 'qrotect-public-data-v1' || name === 'qrotect-public-maps-v1') {
              await caches.delete(name);
            } else if (name.startsWith('serwist-precache-')) {
              const cache = await caches.open(name);
              if (await cache.match('/offline', { ignoreSearch: true })) await caches.delete(name);
            }
          }),
        );
      } finally {
        await self.clients.claim();
        await self.registration.unregister();
      }
    })(),
  );
});
