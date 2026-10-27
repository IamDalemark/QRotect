import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';

const publicSans = localFont({
  src: '../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2',
  variable: '--font-public-sans',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'QROTECT | Emergency Contact Directory',
    template: '%s | QROTECT',
  },
  description: 'Find campus and public emergency contacts with QROTECT.',
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={publicSans.variable}>{children}</body>
    </html>
  );
}
