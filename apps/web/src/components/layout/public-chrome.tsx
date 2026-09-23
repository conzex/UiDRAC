/** Public pages: header + main + footer with consistent container width. */
'use client';

import PublicHeader from './public-header';
import PublicFooter from './public-footer';
import PageContainer from './page-container';
import { cn } from '@/lib/utils';

type PublicChromeProps = {
  children: React.ReactNode;
  mainClassName?: string;
  /** When true, main content is wrapped in PageContainer. */
  contained?: boolean;
};

export default function PublicChrome({
  children,
  mainClassName,
  contained = true,
}: PublicChromeProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-body">
      <PublicHeader />
      <main className={cn('flex-1', mainClassName)}>
        {contained ? <PageContainer>{children}</PageContainer> : children}
      </main>
      <PublicFooter />
    </div>
  );
}
