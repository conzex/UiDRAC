'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/app-modal';
import api from '@/lib/api';
import { clearAuthStorage, persistAuth, readAccessToken, readStoredUser } from '@/lib/auth-client';
import { CLOUD_SAAS_PRODUCT } from '@idrac/shared';

const labelClass = 'block text-sm font-medium text-text-primary mb-1';
const inputClass =
  'w-full px-3 py-2 border border-border-card rounded text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue';
const fieldRowClass = 'space-y-2 text-sm';

type AccountModalsProps = {
  profileOpen: boolean;
  passwordOpen: boolean;
  onCloseProfile: () => void;
  onClosePassword: () => void;
  onOpenPassword: () => void;
};

export function AccountModals({
  profileOpen,
  passwordOpen,
  onCloseProfile,
  onClosePassword,
  onOpenPassword,
}: AccountModalsProps) {
  return (
    <>
      <ProfileModal open={profileOpen} onClose={onCloseProfile} onOpenPassword={onOpenPassword} />
      <PasswordModal open={passwordOpen} onClose={onClosePassword} />
    </>
  );
}

function ProfileModal({
  open,
  onClose,
  onOpenPassword,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPassword: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setMsg('');
    api.get('/auth/me').then((r) => setProfile(r.data.user)).catch(() => setMsg('Failed to load profile'));
  }, [open]);

  const refreshSession = async () => {
    const token = readAccessToken();
    if (!token) return;
    const { data } = await api.get('/auth/me');
    persistAuth(token, data.user);
    setProfile(data.user);
    setMsg('Account refreshed from server.');
  };

  const stored = readStoredUser();

  const rows: [string, string][] = [
    ['Email', profile?.email || stored?.email || '—'],
    ...(CLOUD_SAAS_PRODUCT
      ? []
      : [['Role', (profile?.role || stored?.role || '—').toString().toLowerCase()] as [string, string]]),
    ['Organization', profile?.tenant?.name || '—'],
    [
      'Last login',
      profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : '—',
    ],
  ];

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Profile"
      subtitle={CLOUD_SAAS_PRODUCT ? 'Your Conzex account' : 'Your account in this organization'}
    >
      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-dell-blue text-sm p-3 rounded mb-4">{msg}</div>
      )}
      <div className={fieldRowClass}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex border-b border-border-card pb-2 last:border-0">
            <span className="w-1/3 text-text-secondary shrink-0">{k}</span>
            <span className="w-2/3 font-medium text-text-primary capitalize">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={refreshSession}
          className="flex-1 py-2.5 bg-dell-blue text-white rounded font-semibold text-sm hover:bg-dell-blue-hover"
        >
          Refresh account
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPassword();
          }}
          className="flex-1 py-2.5 border border-border-card rounded text-sm font-semibold text-text-primary hover:bg-row-hover"
        >
          Change password
        </button>
      </div>
    </AppModal>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setError('');
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      clearAuthStorage();
      onClose();
      router.push('/login?reason=password-changed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} title="Change password" subtitle="You will be signed out after saving">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded">{error}</div>
        )}
        <div>
          <label className={labelClass}>Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold text-sm hover:bg-dell-blue-hover disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AppModal>
  );
}
