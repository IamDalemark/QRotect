/// <reference lib="webworker" />
import { Serwist, NetworkOnly, type PrecacheEntry } from 'serwist';
import { snapshotSchema } from '@/lib/directory/schema';
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};
const publicPaths = new Set(['/', '/directory', '/guidance', '/campus-map', '/about', '/offline']);
const navigation = new NetworkOnly({ networkTimeoutSeconds: 3 });
const worker: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  precacheOptions: { cleanupOutdatedCaches: true },
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url, request }) =>
        sameOrigin && request.mode === 'navigate' && publicPaths.has(url.pathname),
      handler: async (options) => {
        // Returning visitors can use the saved shell immediately, even while
        // online. PublicProvider validates saved data and refreshes separately.
        try {
          const saved = await (
            await caches.open('qrotect-public-data-v1')
          ).match('/__qrotect/saved-directory');
          if (saved && snapshotSchema.safeParse((await saved.json()).snapshot).success) {
            const shell = await worker.matchPrecache('/offline');
            if (shell) return shell;
          }
        } catch {
          /* Unavailable or corrupt storage falls back to the network. */
        }
        return navigation.handle(options);
      },
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
