/** Register page — Tenant signup form with shared header/footer. */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Shield, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { persistAuth } from '@/lib/auth-client';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';

export default function RegisterPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password, tenantName });
      persistAuth(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-bg-body to-white py-12 sm:py-20">
        <div className="bg-white border border-border-card rounded shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="iDRAC Console" className="h-14 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary">Create Account</h1>
            <p className="text-sm text-text-secondary mt-1">Register your organization to get started</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Organization Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required
                  placeholder="Enter organization name"
                  className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="Create a password (min 6 characters)"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-text-secondary flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Your data is encrypted and secure
          </div>

          <div className="mt-6 pt-4 border-t border-border-card text-center">
            <p className="text-sm text-text-secondary">
              Already have an account? <a href="/login" className="text-dell-blue hover:underline font-medium">Sign in</a>
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
