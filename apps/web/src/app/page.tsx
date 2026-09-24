/** Landing page — Hero + minimal content below the fold. */
'use client';
import { useEffect, useState } from 'react';
import {
  Server, Shield, Monitor, Zap, BookOpen, ArrowRight, LayoutDashboard, Activity, Lock, ChevronRight,
} from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';
import { PAGE_CONTAINER_CLASS } from '@/components/layout/page-container';

const stats = [
  { value: '4', label: 'iDRAC Generations', sub: '6 · 7 · 8 · 9' },
  { value: '30+', label: 'API Endpoints', sub: 'Full coverage' },
  { value: '256-bit', label: 'AES Encryption', sub: 'Credentials at rest' },
  { value: '< 5 min', label: 'Deployment', sub: 'Docker Compose' },
];

const highlights = [
  { Icon: Server, title: 'All iDRAC generations', desc: 'Auto-detect iDRAC 6–9 and route Redfish or legacy protocols from one UI.' },
  { Icon: Shield, title: 'Security & compliance', desc: 'RBAC, encrypted credentials, session timeout, and immutable audit logging.' },
  { Icon: Monitor, title: 'Remote console', desc: 'HTML5 for modern iDRAC; noVNC bridge for legacy—no browser plugins.' },
  { Icon: Zap, title: 'Operations', desc: 'Power, thermal, sensors, storage, BIOS, virtual media, and LC jobs.' },
];

const generations = [
  { gen: 'iDRAC 9', protocol: 'Redfish v1.6+', servers: 'PowerEdge 14G–16G' },
  { gen: 'iDRAC 8', protocol: 'Redfish v1.x', servers: 'PowerEdge 13G' },
  { gen: 'iDRAC 7', protocol: 'Legacy XML', servers: 'PowerEdge 12G' },
  { gen: 'iDRAC 6', protocol: 'Legacy CGI', servers: 'PowerEdge 11G' },
];

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      {/* Hero — unchanged */}
      <section className="relative bg-gradient-to-br from-dell-blue via-dell-blue to-dell-dark text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className={`relative ${PAGE_CONTAINER_CLASS} py-20 sm:py-28 lg:py-32`}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-6 border border-white/20">
              <Activity className="w-3 h-3" /> Open Source · Self-Hosted · Zero Client Install
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
              Unified Management for<br className="hidden sm:block" />
              <span className="text-white/90">Every Dell PowerEdge Server</span>
            </h1>
            <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              A Docker-hosted web platform that brings modern management to all iDRAC generations
              — from legacy iDRAC 6 to the latest iDRAC 9 — through a single, consistent interface.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isLoggedIn ? (
                <a href="/dashboard" className="px-6 py-3 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2 shadow-lg shadow-black/10">
                  <LayoutDashboard className="w-4 h-4" /> Go to Dashboard <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <>
                  <a href="/register" className="px-6 py-3 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2 shadow-lg shadow-black/10">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </a>
                  <a href="/login" className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/20 transition-colors border border-white/25 inline-flex items-center justify-center gap-2 backdrop-blur-sm">
                    <Lock className="w-4 h-4" /> Sign In
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="bg-white border-b border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-card border border-border-card rounded overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="bg-white py-6 sm:py-7 px-4 sm:px-5">
                <div className="text-xl sm:text-2xl font-bold text-dell-blue tabular-nums">{s.value}</div>
                <div className="text-sm font-medium text-text-primary mt-1">{s.label}</div>
                <div className="text-xs text-text-secondary">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-12 sm:py-14 bg-bg-body">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="max-w-xl mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">Built for real infrastructure teams</h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Self-hosted management that matches Dell iDRAC workflows—without Java, ActiveX, or per-generation tools.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h.title} className="flex gap-4 bg-white border border-border-card rounded p-5">
                <div className="w-10 h-10 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center shrink-0">
                  <h.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{h.title}</h3>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-secondary">
            Full feature list, setup, and architecture details in{' '}
            <a href="/docs" className="text-dell-blue font-semibold hover:underline inline-flex items-center gap-0.5">
              documentation <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </p>
        </div>
      </section>

      {/* Generations */}
      <section className="py-12 sm:py-14 bg-white border-t border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-4">Supported iDRAC generations</h2>
          <div className="border border-border-card rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card-header border-b border-border-card text-left">
                  <th className="p-3 font-semibold text-text-primary">Generation</th>
                  <th className="p-3 font-semibold text-text-primary hidden sm:table-cell">Protocol</th>
                  <th className="p-3 font-semibold text-text-primary">PowerEdge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card">
                {generations.map((g) => (
                  <tr key={g.gen} className="hover:bg-row-hover">
                    <td className="p-3 font-medium text-text-primary">{g.gen}</td>
                    <td className="p-3 text-text-secondary hidden sm:table-cell">{g.protocol}</td>
                    <td className="p-3 text-text-secondary">{g.servers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-br from-dell-blue to-dell-dark text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className={`relative ${PAGE_CONTAINER_CLASS} py-14 sm:py-16 text-center`}>
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-2">Ready to manage your fleet?</h2>
            <p className="text-sm text-white/70 mb-6">Deploy with Docker Compose. Open source and self-hosted.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={isLoggedIn ? '/dashboard' : '/register'} className="px-6 py-3 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2">
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/docs#getting-started" className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded border border-white/25 hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4" /> Documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
