/** Login page — Dell iDRAC 9 styled login screen with shared header/footer. */
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Shield, Clock } from 'lucide-react';
import api from '@/lib/api';
import { persistAuth } from '@/lib/auth-client';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (searchParams?.get('reason') === 'timeout') setTimedOut(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persistAuth(data.accessToken, data.user);
      const next = searchParams?.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-border-card rounded shadow-xl w-full max-w-md p-8">
      <div className="text-center mb-6">
        <img src="/logo.png" alt="iDRAC Console" className="h-14 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-text-primary">Welcome Back</h1>
        <p className="text-sm text-text-secondary mt-1">Sign in to your iDRAC Console</p>
      </div>

      {timedOut && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3 rounded mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" /> Your session expired due to inactivity. Please sign in again.
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Username</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder="Enter your username"
            autoComplete="username"
            className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {loading ? 'Signing in...' : <><Lock className="w-4 h-4" /> Log In</>}
        </button>
      </form>

      <div className="mt-4 text-center text-xs text-text-secondary flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Your session is secured with TLS encryption
      </div>

      <div className="mt-6 pt-4 border-t border-border-card text-center">
        <p className="text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-dell-blue hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-bg-body to-white py-12 sm:py-20">
        <Suspense fallback={
          <div className="bg-white border border-border-card rounded shadow-xl w-full max-w-md p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-dell-blue border-t-transparent rounded-full mx-auto" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
