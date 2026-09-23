import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Universal iDRAC Console',
  description: 'Manage Dell PowerEdge servers across all iDRAC generations',
  icons: { icon: '/favicon.png' },
  authors: [{ name: 'Sumit Kumawat', url: 'https://www.sumitkumawat.com' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
