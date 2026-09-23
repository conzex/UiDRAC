/** public-footer.tsx — Shared footer for all pages. */
'use client';

import { APP_VERSION_LABEL } from '@idrac/shared';
import PageContainer from './page-container';

export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-border-card py-4 shrink-0">
      <PageContainer>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1">
            <img src="/logo.png" alt="iDRAC Console" className="h-4 opacity-50" />
            <span className="ml-1">Universal iDRAC Console {APP_VERSION_LABEL}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>&copy; {year}</span>
            <a href="https://www.sumitkumawat.com" target="_blank" rel="noopener noreferrer" className="text-dell-blue hover:underline">Sumit Kumawat</a>
            <span className="mx-1">&middot;</span>
            <a href="mailto:hello@sumitkumawat.com" className="text-dell-blue hover:underline">hello@sumitkumawat.com</a>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
