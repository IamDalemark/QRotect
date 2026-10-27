import { serwist } from '@serwist/next/config';

// Build after Next.js, without injecting a storage-dependent client bootstrap.
// Only static assets and the dedicated public fallback may be precached.
export default serwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: false,
  globPatterns: [
    '.next/static/**/*.{js,css,woff2}',
    '.next/server/app/offline.html',
    'public/icon.svg',
  ],
});
