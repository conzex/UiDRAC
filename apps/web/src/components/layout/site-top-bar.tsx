'use client';

import Link from 'next/link';
import { PRODUCT_NAME } from '@idrac/shared';
import { BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserMenu from './user-menu';
import { PAGE_CONTAINER_CLASS } from './page-container';
import api from '@/lib/api';
import { persistAuth, readAccessToken, useAuthUser } from '@/lib/auth-client';

type SiteTopBarProps = {
  email?: string;
  role?: string;
  showDocs?: boolean;
  innerClassName?: string;
};

const dividerClass = 'w-px h-6 bg-white/30 shrink-0';

export default function SiteTopBar({
  email,
  role,
  showDocs = true,
  innerClassName = '',
}: SiteTopBarProps) {
  const router = useRouter();
  const { sync } = useAuthUser();

  const goDashboard = async (e: React.MouseEvent) => {
    e.preventDefault();
    sync();
    const token = readAccessToken();
    if (token) {
      try {
        const { data } = await api.get('/auth/me');
        persistAuth(token, data.user);
      } catch {
        /* keep existing session */
      }
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <header className="h-[52px] bg-dell-blue flex items-center text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className={`${PAGE_CONTAINER_CLASS} flex items-center justify-between gap-2 min-w-0 ${innerClassName}`}>
        <Link
          href="/dashboard"
          onClick={goDashboard}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 min-w-0"
          title="Go to dashboard"
        >
          <img src="/logo.png" alt={PRODUCT_NAME} className="h-6 sm:h-7 brightness-0 invert" />
          <div className={`${dividerClass} hidden sm:block`} />
          <span className="text-sm font-semibold tracking-wide hidden sm:block">{PRODUCT_NAME}</span>
        </Link>
        <div className="ml-auto flex items-center shrink-0">
          {showDocs && (
            <Link
              href="/docs"
              className="pr-2.5 text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </Link>
          )}
          {email !== undefined && (
            <div className="flex items-center">
              <div className={dividerClass} />
              <div className="pl-2.5">
                <UserMenu email={email} role={role} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
