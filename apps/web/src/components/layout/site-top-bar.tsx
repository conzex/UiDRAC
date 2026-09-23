'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import UserMenu from './user-menu';

type SiteTopBarProps = {
  logoHref: string;
  email?: string;
  role?: string;
  showDocs?: boolean;
  maxWidthClass?: string;
  innerClassName?: string;
};

export default function SiteTopBar({
  logoHref,
  email,
  role,
  showDocs = true,
  maxWidthClass = 'max-w-layout',
  innerClassName = 'px-4 sm:px-6',
}: SiteTopBarProps) {
  return (
    <header className="h-[52px] bg-dell-blue flex items-center text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className={`${maxWidthClass} mx-auto w-full ${innerClassName} flex items-center justify-between gap-4 min-w-0`}>
        <Link href={logoHref} className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0">
          <img src="/logo.png" alt="iDRAC Console" className="h-6 sm:h-7 brightness-0 invert" />
          <div className="w-px h-6 bg-white/30 hidden sm:block" />
          <span className="text-sm font-semibold tracking-wide hidden sm:block">Universal iDRAC Console</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          {showDocs && (
            <Link
              href="/docs"
              className="text-white/70 hover:text-white text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </Link>
          )}
          {email !== undefined && (
            <>
              <div className="w-px h-5 bg-white/20 hidden sm:block" />
              <UserMenu email={email} role={role} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
