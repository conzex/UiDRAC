'use client';

import { useRef, useEffect, useState } from 'react';
import { User, LogOut, KeyRound, UserCircle } from 'lucide-react';
import { clearAuthStorage } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { AccountModals } from '@/components/profile/account-modals';
import { CLOUD_SAAS_PRODUCT } from '@idrac/shared';

type UserMenuProps = {
  email?: string;
  role?: string;
  tone?: 'on-blue' | 'on-white';
};

export default function UserMenu({ email, role, tone = 'on-blue' }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const logout = () => {
    clearAuthStorage();
    router.push('/login');
  };

  const triggerClass =
    tone === 'on-blue'
      ? 'flex items-center gap-1.5 text-sm text-white/80 hover:text-white'
      : 'flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary';

  return (
    <>
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(!open)} className={triggerClass} aria-expanded={open}>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:block truncate max-w-[180px]">{email || 'Account'}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-52 z-50 border border-border-card">
            {role && !CLOUD_SAAS_PRODUCT && (
              <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card capitalize">
                {role.toLowerCase()}
              </div>
            )}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                setProfileOpen(true);
              }}
            >
              <UserCircle className="w-3.5 h-3.5" /> Profile
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                setPasswordOpen(true);
              }}
            >
              <KeyRound className="w-3.5 h-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2 border-t border-border-card"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        )}
      </div>
      <AccountModals
        profileOpen={profileOpen}
        passwordOpen={passwordOpen}
        onCloseProfile={() => setProfileOpen(false)}
        onClosePassword={() => setPasswordOpen(false)}
        onOpenPassword={() => setPasswordOpen(true)}
      />
    </>
  );
}
