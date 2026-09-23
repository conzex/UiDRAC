/** Landing page — Professional hero with features, stats, and CTA. */
'use client';
import { useEffect, useState } from 'react';
import {
  Server, Shield, Zap, Monitor, Globe, Lock, BarChart3, Wrench, Cpu, HardDrive,
  Thermometer, BookOpen, ArrowRight, CheckCircle, LayoutDashboard, Activity,
  Layers, Terminal, Database, GitBranch, ChevronRight,
} from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';
import { PAGE_CONTAINER_CLASS } from '@/components/layout/page-container';

const features = [
  { Icon: Server, title: 'Multi-Generation Support', desc: 'Manage iDRAC 6, 7, 8, and 9 from a single pane of glass with automatic generation detection.' },
  { Icon: Shield, title: 'Enterprise Security', desc: 'AES-256-GCM encryption, JWT auth, RBAC roles, session timeout, and full audit logging.' },
  { Icon: Monitor, title: 'Virtual Console', desc: 'HTML5 native console for modern iDRAC and noVNC bridge for legacy — no plugins required.' },
  { Icon: Zap, title: 'Power Management', desc: 'Real-time power readings, thermal monitoring, and power cap configuration.' },
  { Icon: HardDrive, title: 'Storage Management', desc: 'RAID controllers, physical disks, virtual disks — complete storage health at a glance.' },
  { Icon: Cpu, title: 'Hardware Inventory', desc: 'CPUs, memory DIMMs, PCIe devices, firmware versions — full hardware insight.' },
  { Icon: Thermometer, title: 'Sensor Monitoring', desc: 'Temperature, fan speed, voltage, and power sensors with threshold alerts.' },
  { Icon: Wrench, title: 'BIOS Configuration', desc: 'View and edit BIOS attributes, manage boot order, export Server Configuration Profiles.' },
  { Icon: Globe, title: 'Multi-Tenant Architecture', desc: 'Organization-scoped isolation for servers, users, and audit logs with super admin override.' },
  { Icon: Lock, title: 'Virtual Media', desc: 'Mount ISO images via CIFS/NFS/HTTP for remote OS installation and recovery.' },
  { Icon: BarChart3, title: 'Lifecycle Controller', desc: 'View LC job queue, manage firmware updates, and export configuration tasks.' },
  { Icon: BookOpen, title: 'Comprehensive Docs', desc: 'Complete documentation covering setup, architecture, API reference, and user guides.' },
];

const stats = [
  { value: '4', label: 'iDRAC Generations', sub: '6 · 7 · 8 · 9' },
  { value: '30+', label: 'API Endpoints', sub: 'Full Feature Coverage' },
  { value: '256-bit', label: 'AES Encryption', sub: 'Credential Security' },
  { value: '< 5 min', label: 'Deployment', sub: 'Docker Compose' },
];

const generations = [
  { gen: 'iDRAC 9', protocol: 'Redfish v1.6+', servers: 'PowerEdge 14G / 15G / 16G', badge: 'Latest', color: 'bg-dell-blue', badgeColor: 'bg-dell-blue' },
  { gen: 'iDRAC 8', protocol: 'Redfish v1.x', servers: 'PowerEdge 13G', badge: 'Modern', color: 'bg-blue-500', badgeColor: 'bg-blue-500' },
  { gen: 'iDRAC 7', protocol: 'Legacy XML API', servers: 'PowerEdge 12G', badge: 'Legacy', color: 'bg-amber-500', badgeColor: 'bg-amber-500' },
  { gen: 'iDRAC 6', protocol: 'Legacy CGI/HTML', servers: 'PowerEdge 11G', badge: 'Legacy', color: 'bg-gray-500', badgeColor: 'bg-gray-500' },
];

const techStack = [
  { Icon: Layers, name: 'Next.js 14', desc: 'App Router + SSR' },
  { Icon: Terminal, name: 'NestJS', desc: 'TypeScript API' },
  { Icon: Database, name: 'PostgreSQL 16', desc: 'Multi-tenant DB' },
  { Icon: Activity, name: 'Redis 7', desc: 'Session Cache' },
  { Icon: GitBranch, name: 'Turborepo', desc: 'Monorepo Build' },
  { Icon: Shield, name: 'Prisma ORM', desc: 'Type-safe Queries' },
];

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      {/* Hero */}
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

      {/* Stats */}
      <section className="bg-white border-b border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border-card">
            {stats.map((s) => (
              <div key={s.label} className="py-8 sm:py-10 text-center px-4">
                <div className="text-2xl sm:text-3xl font-bold text-dell-blue mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-text-primary">{s.label}</div>
                <div className="text-xs text-text-secondary mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Generation Support */}
      <section className="py-14 sm:py-16 bg-bg-body">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">All Generations. One Platform.</h2>
            <p className="text-sm text-text-secondary max-w-2xl mx-auto">Automatic protocol detection adapts seamlessly — Redfish REST for modern, legacy XML/CGI for older hardware.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {generations.map((g) => (
              <div key={g.gen} className="bg-white border border-border-card rounded hover:border-dell-blue hover:shadow-lg transition-all group">
                <div className="bg-card-header px-4 py-3 border-b border-border-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded ${g.color} text-white flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Server className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm font-bold text-text-primary">{g.gen}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${g.badgeColor} text-white`}>{g.badge}</span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Protocol</span>
                    <span className="text-xs font-medium text-text-primary">{g.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Servers</span>
                    <span className="text-xs font-medium text-text-primary">{g.servers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-14 sm:py-16 bg-white">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">Everything You Need</h2>
            <p className="text-sm text-text-secondary max-w-2xl mx-auto">Full-featured iDRAC management with every capability of the native web console — and more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-border-card rounded hover:border-dell-blue hover:shadow-md transition-all group">
                <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center group-hover:bg-dell-blue group-hover:text-white transition-colors">
                    <f.Icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{f.title}</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-14 sm:py-16 bg-bg-body">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">Built on Modern Infrastructure</h2>
            <p className="text-sm text-text-secondary">Production-grade stack designed for reliability, performance, and developer experience.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {techStack.map((t) => (
              <div key={t.name} className="bg-white border border-border-card rounded p-4 text-center hover:border-dell-blue hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-lg bg-dell-blue/10 text-dell-blue flex items-center justify-center mx-auto mb-2.5 group-hover:bg-dell-blue group-hover:text-white transition-colors">
                  <t.Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                <div className="text-[11px] text-text-secondary mt-0.5">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-14 sm:py-16 bg-white">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">Why Universal iDRAC Console?</h2>
            <p className="text-sm text-text-secondary">The platform that eliminates the pain of managing mixed-generation Dell server fleets.</p>
          </div>
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Key Advantages</h3>
            </div>
            <div className="divide-y divide-border-card">
              {[
                { text: 'No client-side Java, ActiveX, or browser plugins required', bold: 'Zero dependencies' },
                { text: 'Works with every Dell PowerEdge from 11th to 16th generation', bold: 'Universal compatibility' },
                { text: 'Docker-hosted — deploy anywhere in under 5 minutes', bold: 'Instant deployment' },
                { text: 'Multi-tenant isolation with full RBAC and audit logging', bold: 'Enterprise ready' },
                { text: 'Session timeout with automatic logout for security compliance', bold: 'Security first' },
                { text: 'AES-256-GCM encrypted credential storage with argon2id hashing', bold: 'Military-grade encryption' },
                { text: 'Real-time sensor monitoring with threshold-based alerting', bold: 'Proactive monitoring' },
                { text: 'Server Configuration Profile export/import for backup & migration', bold: 'Config management' },
              ].map((item, i) => (
                <div key={item.bold} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                  <CheckCircle className="w-4 h-4 text-green-healthy shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary">{item.text}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-dell-blue uppercase tracking-wide shrink-0 hidden sm:block">{item.bold}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-br from-dell-blue to-dell-dark text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Ready to Manage Your Server Fleet?</h2>
          <p className="text-sm text-white/70 mb-8 max-w-lg mx-auto">Deploy in minutes with Docker Compose. No client software, no license fees, no vendor lock-in.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={isLoggedIn ? '/dashboard' : '/register'} className="px-6 py-3 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2 shadow-lg shadow-black/10">
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'} <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/docs" className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded border border-white/25 hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2 backdrop-blur-sm">
              <BookOpen className="w-4 h-4" /> Read the Documentation
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
