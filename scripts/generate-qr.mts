import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
const input = process.argv[2];
if (!input) throw new Error('Supply the approved stable HTTPS research URL.');
const url = new URL(input);
if (
  url.protocol !== 'https:' ||
  url.username ||
  url.password ||
  (url.hostname.endsWith('.vercel.app') && /-[a-z0-9]{9}-/.test(url.hostname))
)
  throw new Error('Use the approved stable HTTPS alias, without embedded credentials.');
mkdirSync('.local/qr', { recursive: true });
const options = {
  errorCorrectionLevel: 'M' as const,
  margin: 4,
  color: { dark: '#890B1A', light: '#FFFFFF' },
  width: 1024,
};
writeFileSync(
  '.local/qr/qrotect.svg',
  await QRCode.toString(url.href, { ...options, type: 'svg' }),
);
await QRCode.toFile('.local/qr/qrotect.png', url.href, options);
writeFileSync('.local/qr/destination.txt', url.href + '\n');
console.log(
  'QR artwork saved in .local/qr. Check the destination and test printed scans before use.',
);
