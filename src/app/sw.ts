/// <reference lib="webworker" />
import { Serwist, NetworkOnly, type PrecacheEntry } from 'serwist';
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};
const publicPaths = new Set(['/', '/directory', '/guidance', '/campus-map', '/about', '/offline']);
const worker = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  precacheOptions: { cleanupOutdatedCaches: true },
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url, request }) =>
        sameOrigin && request.mode === 'navigate' && publicPaths.has(url.pathname),
      handler: new NetworkOnly({ networkTimeoutSeconds: 3 }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) =>
          request.mode === 'navigate' && publicPaths.has(new URL(request.url).pathname),
      },
    ],
  },
});
worker.addEventListeners();
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    /^\/api\/public\/maps\/[0-9a-f-]+$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open('qrotect-public-maps-v1');
        const stored = await cache.match(event.request);
        return stored || fetch(event.request);
      })(),
    );
  }
});
