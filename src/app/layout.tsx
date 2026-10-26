import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "QROTECT | Emergency Contact Directory",
    template: "%s | QROTECT",
  },
  description: "An emergency contact research prototype for CPU Senior High School.",
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
