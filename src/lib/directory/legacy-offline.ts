// Remove only storage and registrations belonging to QROTECT's retired feature.
export async function retireOfflineAccess(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          const workers = [registration.active, registration.waiting, registration.installing];
          if (
            workers.some((worker) => worker?.scriptURL === new URL('/sw.js', location.origin).href)
          )
            await registration.unregister();
        }),
      );
    }
  } catch {
    // Legacy cleanup must never block the online directory.
  }
  try {
    if (!('caches' in globalThis)) return;
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
  } catch {
    // Storage is optional; no new offline data is created.
  }
}
