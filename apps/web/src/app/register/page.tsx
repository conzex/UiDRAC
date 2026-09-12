/** Register page — Tenant signup form. */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

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
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) { setError(err.response?.data?.message || 'Registration failed'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dell-blue to-dell-dark">
      <div className="bg-white rounded shadow-2xl w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-center mb-6">Create Account</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Organization Name</label><input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" /></div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-dell-blue text-white font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50">{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div className="mt-4 text-center text-sm"><a href="/login" className="text-dell-blue hover:underline">Already have an account? Sign in</a></div>
      </div>
    </div>
  );
}
