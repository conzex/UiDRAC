/** Login page — Dell iDRAC 9 styled login screen. */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dell-blue to-dell-dark">
      <div className="bg-white rounded shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dell-blue mb-4">
            <svg viewBox="0 0 40 16" className="w-10 h-4 fill-white">
              <text x="0" y="14" fontFamily="Arial Black" fontSize="16" fontWeight="900">DELL</text>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Universal iDRAC Console</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@company.com"
              className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded" />
            Remember for this browser session only
          </label>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50 transition-colors">
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-text-secondary flex items-center justify-center gap-1.5">
          <span>🛡️</span> Your session will be secured with TLS encryption
        </div>

        <div className="mt-6 pt-4 border-t border-border-card text-center">
          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link href="/register" className="text-dell-blue hover:underline font-medium">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
