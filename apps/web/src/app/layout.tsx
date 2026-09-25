import './globals.css';
import type { Metadata } from 'next';
import { PRODUCT_NAME } from '@idrac/shared';
import ClientProviders from '@/components/layout/client-providers';

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'Conzex product for managing Dell PowerEdge servers across all iDRAC generations (6, 7, 8, 9)',
  icons: { icon: '/favicon.png' },
  authors: [{ name: 'Conzex Global Private Limited', url: 'https://www.conzex.com' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-body">
        <div id="app-modal-root" />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
