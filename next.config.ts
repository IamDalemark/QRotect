import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async redirects() {
    return [{ source: '/offline', destination: '/directory', permanent: true }];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};
export default nextConfig;
