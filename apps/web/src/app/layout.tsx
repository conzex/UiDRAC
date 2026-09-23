import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Universal iDRAC Console',
  description: 'Zero-client-install web platform for managing Dell PowerEdge servers across all iDRAC generations (6, 7, 8, 9)',
  icons: { icon: '/favicon.png' },
  authors: [{ name: 'Sumit Kumawat', url: 'https://www.sumitkumawat.com' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-body">{children}</body>
    </html>
  );
}
