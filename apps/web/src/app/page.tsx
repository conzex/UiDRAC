/** Landing page — Professional hero with features, stats, and CTA. */
'use client';
import Link from 'next/link';
import {
  Server, Shield, Zap, Monitor, Globe, Lock, BarChart3, Wrench, Cpu, HardDrive,
  Thermometer, BookOpen, ArrowRight, CheckCircle, LayoutDashboard, Activity,
  Layers, Terminal, Database, GitBranch,
} from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';
import { PAGE_CONTAINER_CLASS } from '@/components/layout/page-container';
import { useAuthUser } from '@/lib/auth-client';

const features = [
  { Icon: Server, title: 'Multi-Generation Support', desc: 'Manage iDRAC 6 through 9 from one console with automatic generation detection.' },
  { Icon: Shield, title: 'Enterprise Security', desc: 'AES-256-GCM credential encryption, JWT authentication, RBAC, session timeout, and audit logging.' },
  { Icon: Monitor, title: 'Virtual Console', desc: 'HTML5 console for modern iDRAC and noVNC bridge for legacy systems—no browser plugins.' },
  { Icon: Zap, title: 'Power Management', desc: 'Power control, readings, thermal data, and configurable power caps from a unified interface.' },
  { Icon: HardDrive, title: 'Storage Management', desc: 'RAID controllers, physical disks, and virtual disks with health status at a glance.' },
  { Icon: Cpu, title: 'Hardware Inventory', desc: 'Processors, memory, PCIe devices, and firmware inventory across the fleet.' },
  { Icon: Thermometer, title: 'Sensor Monitoring', desc: 'Temperature, fan, voltage, and power sensors with threshold visibility.' },
  { Icon: Wrench, title: 'BIOS Configuration', desc: 'BIOS attributes, boot order, and Server Configuration Profile export.' },
  { Icon: Globe, title: 'Multi-Tenant Architecture', desc: 'Organization-scoped data isolation with role-based access and audit trails.' },
  { Icon: Lock, title: 'Virtual Media', desc: 'Remote ISO mount via CIFS, NFS, or HTTP for installation and recovery workflows.' },
  { Icon: BarChart3, title: 'Lifecycle Controller', desc: 'LC job visibility, firmware operations, and configuration task management.' },
  { Icon: BookOpen, title: 'Documentation', desc: 'Structured guides for installation, operations, security, and platform architecture.' },
];

const stats = [
  { value: '4', label: 'iDRAC Generations', sub: 'Generations 6–9' },
  { value: '30+', label: 'API Endpoints', sub: 'Full platform coverage' },
  { value: '256-bit', label: 'AES Encryption', sub: 'Credential protection' },
  { value: '< 5 min', label: 'Typical Deploy', sub: 'Docker Compose' },
];

const generations = [
  { gen: 'iDRAC 9', protocol: 'Redfish v1.6+', servers: 'PowerEdge 14G–16G', badge: 'Current', color: 'bg-dell-blue', badgeColor: 'bg-dell-blue' },
  { gen: 'iDRAC 8', protocol: 'Redfish v1.x', servers: 'PowerEdge 13G', badge: 'Supported', color: 'bg-blue-500', badgeColor: 'bg-blue-500' },
  { gen: 'iDRAC 7', protocol: 'Legacy XML API', servers: 'PowerEdge 12G', badge: 'Legacy', color: 'bg-amber-500', badgeColor: 'bg-amber-500' },
  { gen: 'iDRAC 6', protocol: 'Legacy CGI/HTML', servers: 'PowerEdge 11G', badge: 'Legacy', color: 'bg-gray-500', badgeColor: 'bg-gray-500' },
];

const techStack = [
  { Icon: Layers, name: 'Next.js 14', desc: 'App Router' },
  { Icon: Terminal, name: 'NestJS', desc: 'TypeScript API' },
  { Icon: Database, name: 'PostgreSQL 16', desc: 'Multi-tenant data' },
  { Icon: Activity, name: 'Redis 7', desc: 'Session layer' },
  { Icon: GitBranch, name: 'Turborepo', desc: 'Monorepo CI' },
  { Icon: Shield, name: 'Prisma ORM', desc: 'Type-safe access' },
];

function SectionHeading({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="text-center mb-10 max-w-2xl mx-auto">
      <p className="text-[11px] font-bold uppercase tracking-widest text-dell-blue mb-2">{label}</p>
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">{title}</h2>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const { loggedInOrToken, ready } = useAuthUser();

  return (
    <div className="min-h-screen flex flex-col bg-bg-body">
      <PublicHeader />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-dell-blue via-dell-blue to-dell-dark text-white border-b border-white/10">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className={`relative ${PAGE_CONTAINER_CLASS} py-16 sm:py-20 lg:py-24`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-3">Universal iDRAC Console</p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] mb-4">
                Unified management for Dell PowerEdge infrastructure
              </h1>
              <p className="text-base sm:text-lg text-white/75 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                A self-hosted control plane for iDRAC 6 through 9. Deploy with Docker, manage your fleet in the browser, and maintain consistent operations across generations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {ready && loggedInOrToken ? (
                  <Link href="/dashboard" className="px-6 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/95 transition-colors inline-flex items-center justify-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Open Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="px-6 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/95 transition-colors inline-flex items-center justify-center gap-2">
                      Create Account <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/login" className="px-6 py-2.5 bg-white/10 text-white text-sm font-semibold rounded border border-white/30 hover:bg-white/15 transition-colors inline-flex items-center justify-center gap-2">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> RBAC &amp; audit logging</span>
                <span className="inline-flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> Zero client install</span>
                <Link href="/docs" className="inline-flex items-center gap-1 text-white/80 hover:text-white font-medium">
                  View documentation <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="bg-white/10 border border-white/20 rounded backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20">
                <div className="px-4 py-2.5 border-b border-white/15 bg-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white/90">Fleet overview</span>
                  <span className="text-[10px] text-white/50 font-mono">Preview</span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { name: 'Production-R740', ip: '10.0.12.40', health: 'Healthy', gen: 'iDRAC 9' },
                    { name: 'DR-R630', ip: '10.0.12.41', health: 'Warning', gen: 'iDRAC 8' },
                    { name: 'Lab-R730xd', ip: '10.0.12.52', health: 'Healthy', gen: 'iDRAC 7' },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 py-2 border-b border-white/10 last:border-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{row.name}</div>
                        <div className="text-[11px] text-white/50 font-mono">{row.ip}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase tracking-wide text-white/70">{row.gen}</div>
                        <div className="text-[11px] text-white/80">{row.health}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <div className="border border-border-card rounded overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border-card">
              {stats.map((s) => (
                <div key={s.label} className="py-8 sm:py-9 text-center px-4 bg-white">
                  <div className="text-2xl sm:text-3xl font-bold text-dell-blue mb-1 tabular-nums">{s.value}</div>
                  <div className="text-sm font-semibold text-text-primary">{s.label}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Generation Support */}
      <section className="py-14 sm:py-16">
        <div className={PAGE_CONTAINER_CLASS}>
          <SectionHeading
            label="Compatibility"
            title="All generations. One platform."
            description="Automatic protocol selection—Redfish for modern controllers, legacy XML and CGI adapters for older hardware."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {generations.map((g) => (
              <div key={g.gen} className="bg-white border border-border-card rounded hover:border-dell-blue/80 hover:shadow-md transition-all">
                <div className="bg-card-header px-4 py-3 border-b border-border-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded ${g.color} text-white flex items-center justify-center`}>
                      <Server className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-text-primary">{g.gen}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${g.badgeColor} text-white`}>{g.badge}</span>
                </div>
                <div className="px-4 py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-secondary">Protocol</span>
                    <span className="font-medium text-text-primary text-right">{g.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-secondary">Platforms</span>
                    <span className="font-medium text-text-primary text-right">{g.servers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-16 bg-white border-y border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <SectionHeading
            label="Capabilities"
            title="Operations covered end to end"
            description="The same operational areas you expect from native iDRAC tooling—centralized, consistent, and accessible from any modern browser."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-border-card rounded hover:border-dell-blue/70 transition-colors">
                <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center">
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
      <section className="py-14 sm:py-16">
        <div className={PAGE_CONTAINER_CLASS}>
          <SectionHeading
            label="Architecture"
            title="Built for production deployments"
            description="A maintainable monorepo stack chosen for security, observability, and long-term operability."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {techStack.map((t) => (
              <div key={t.name} className="bg-white border border-border-card rounded p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-dell-blue/10 text-dell-blue flex items-center justify-center mx-auto mb-2.5">
                  <t.Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                <div className="text-[11px] text-text-secondary mt-0.5">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-14 sm:py-16 bg-white border-t border-border-card">
        <div className={PAGE_CONTAINER_CLASS}>
          <SectionHeading
            label="Why this platform"
            title="Designed for mixed-generation fleets"
            description="Reduce operational friction when legacy and current-generation servers coexist in the same environment."
          />
          <div className="bg-white border border-border-card rounded overflow-hidden">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Operational advantages</h3>
            </div>
            <div className="divide-y divide-border-card">
              {[
                { text: 'No client-side Java, ActiveX, or browser plugins required', bold: 'Zero dependencies' },
                { text: 'Supports PowerEdge platforms from 11th through 16th generation', bold: 'Broad compatibility' },
                { text: 'Containerized deployment suitable for private cloud and edge sites', bold: 'Portable deploy' },
                { text: 'Multi-tenant isolation with RBAC and immutable audit records', bold: 'Enterprise ready' },
                { text: 'Configurable session timeout for security policy alignment', bold: 'Policy aligned' },
                { text: 'AES-256-GCM credential storage with argon2id password hashing', bold: 'Strong cryptography' },
                { text: 'Continuous sensor visibility for proactive capacity planning', bold: 'Observability' },
                { text: 'Server Configuration Profile export for backup and migration', bold: 'Config lifecycle' },
              ].map((item, i) => (
                <div key={item.bold} className={`flex items-center gap-4 px-4 py-3.5 ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
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
      <section className="relative bg-gradient-to-br from-dell-blue to-dell-dark text-white">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className={`relative ${PAGE_CONTAINER_CLASS} py-14 sm:py-16 text-center`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-2">Get started</p>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Deploy your management console</h2>
          <p className="text-sm text-white/75 mb-8 max-w-lg mx-auto leading-relaxed">
            Install with Docker Compose on your infrastructure. Full documentation covers installation, security, and day-two operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ready && loggedInOrToken ? '/dashboard' : '/register'}
              className="px-6 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/95 transition-colors inline-flex items-center justify-center gap-2"
            >
              {ready && loggedInOrToken ? 'Open Dashboard' : 'Create Account'} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs" className="px-6 py-2.5 bg-white/10 text-white text-sm font-semibold rounded border border-white/30 hover:bg-white/15 transition-colors inline-flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" /> Documentation
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
