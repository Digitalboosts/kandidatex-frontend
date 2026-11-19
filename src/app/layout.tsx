import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  // The public site's address, for absolute Open Graph URLs. Set SITE_URL in production.
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'Interview Monitor',
  description: 'Live screen monitoring for remote interviews.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
