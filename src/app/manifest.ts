import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QROTECT Emergency Contacts',
    short_name: 'QROTECT',
    description: 'Campus and public emergency contacts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#890b1a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
