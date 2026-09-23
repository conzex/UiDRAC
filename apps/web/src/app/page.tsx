/** Landing page — Hero section with features and CTA. */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Shield, Zap, Monitor, Globe, Lock, BarChart3, Wrench, Cpu, HardDrive, Thermometer, BookOpen, ArrowRight, CheckCircle } from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';

const features = [
  { Icon: Server, title: 'Multi-Generation Support', desc: 'Manage iDRAC 6, 7, 8, and 9 from a single pane of glass. Automatic generation detection and protocol adaptation.' },
  { Icon: Shield, title: 'Enterprise Security', desc: 'AES-256-GCM credential encryption, JWT auth with refresh tokens, RBAC roles, session timeout, and audit logging.' },
  { Icon: Monitor, title: 'Virtual Console', desc: 'HTML5 native console for iDRAC 8/9 and noVNC bridge for legacy Java viewers on iDRAC 6/7.' },
  { Icon: Zap, title: 'Power Management', desc: 'Full power control with real-time consumption readings, thermal monitoring, power cap configuration.' },
  { Icon: HardDrive, title: 'Storage Management', desc: 'RAID controllers, physical disks, virtual disks — full storage inventory and health monitoring.' },
  { Icon: Cpu, title: 'Hardware Inventory', desc: 'CPU details, memory DIMMs, PCIe devices, firmware versions — complete hardware insight.' },
  { Icon: Thermometer, title: 'Sensor Monitoring', desc: 'Temperature, fan speed, voltage, and power sensor readings with threshold alerts.' },
  { Icon: Wrench, title: 'BIOS Configuration', desc: 'View and edit BIOS attributes, manage boot order, export Server Configuration Profiles.' },
  { Icon: Globe, title: 'Multi-Tenant', desc: 'Tenant isolation with organization-scoped servers, users, and audit logs. Super admin cross-tenant visibility.' },
  { Icon: Lock, title: 'Virtual Media', desc: 'Mount ISO images via CIFS/NFS/HTTP for remote OS installation and recovery.' },
  { Icon: BarChart3, title: 'Lifecycle Controller', desc: 'View and manage LC job queue, firmware updates, and configuration tasks.' },
  { Icon: BookOpen, title: 'Comprehensive Docs', desc: 'Complete documentation covering setup, architecture, API reference, and user guides.' },
];

const generations = [
  { gen: 'iDRAC 9', protocol: 'Redfish v1.6+', servers: 'PowerEdge 14G/15G/16G', color: 'bg-dell-blue' },
  { gen: 'iDRAC 8', protocol: 'Redfish v1.x', servers: 'PowerEdge 13G', color: 'bg-blue-500' },
  { gen: 'iDRAC 7', protocol: 'Legacy /data?get=', servers: 'PowerEdge 12G', color: 'bg-amber-500' },
  { gen: 'iDRAC 6', protocol: 'Legacy /cgi-bin/', servers: 'PowerEdge 11G', color: 'bg-gray-500' },
];

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-dell-blue via-dell-blue to-dell-dark text-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-6">
            <img src="/logo.png" alt="iDRAC Console" className="h-16 mx-auto brightness-0 invert mb-6" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Universal iDRAC Console
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto mb-10">
            Zero-client-install, Docker-hosted web platform for managing Dell PowerEdge servers
            across all iDRAC generations — from legacy iDRAC 6 to modern iDRAC 9.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <a href="/dashboard" className="px-8 py-3.5 bg-white text-dell-blue text-lg font-bold rounded-lg hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" /> Go to Dashboard <ArrowRight className="w-5 h-5" />
              </a>
            ) : (
              <>
                <a href="/register" className="px-8 py-3.5 bg-white text-dell-blue text-lg font-bold rounded-lg hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </a>
                <a href="/login" className="px-8 py-3.5 bg-white/10 text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/30">
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Generation Support */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-4">All Generations. One Platform.</h2>
          <p className="text-text-secondary text-center mb-12 max-w-2xl mx-auto">Automatic protocol detection adapts to each iDRAC generation — Redfish REST API for modern, legacy XML/CGI for older hardware.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {generations.map((g) => (
              <div key={g.gen} className="border border-border-card rounded-lg p-6 text-center hover:shadow-lg transition-shadow">
                <div className={`inline-flex w-12 h-12 rounded-full ${g.color} text-white items-center justify-center mb-4`}>
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-1">{g.gen}</h3>
                <p className="text-sm text-text-secondary mb-2">{g.protocol}</p>
                <p className="text-xs text-text-secondary">{g.servers}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-bg-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-text-secondary text-center mb-12 max-w-2xl mx-auto">Full-featured iDRAC management with every capability of the native web console — and more.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-border-card rounded-lg p-6 hover:border-dell-blue hover:shadow-md transition-all">
                <f.Icon className="w-8 h-8 text-dell-blue mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why Universal iDRAC Console?</h2>
          <div className="space-y-4">
            {[
              'No client-side Java, ActiveX, or browser plugins required',
              'Works with every Dell PowerEdge server from 11th to 16th generation',
              'Docker-hosted — deploy anywhere in minutes',
              'Multi-tenant with full RBAC and audit logging',
              'Session timeout with automatic logout for security',
              'AES-256-GCM encrypted credential storage',
              'Real-time sensor monitoring and alerting',
              'Server Configuration Profile export/import',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-healthy shrink-0 mt-0.5" />
                <span className="text-text-primary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-dell-blue text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Manage Your Fleet?</h2>
          <p className="text-white/80 mb-8">Get started in minutes. No client software required.</p>
          <div className="flex gap-4 justify-center">
            <a href={isLoggedIn ? '/dashboard' : '/register'} className="px-8 py-3 bg-white text-dell-blue font-bold rounded-lg hover:bg-white/90 inline-flex items-center gap-2">
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="w-5 h-5" />
            </a>
            <a href="/docs" className="px-8 py-3 bg-white/10 text-white font-semibold rounded-lg border border-white/30 hover:bg-white/20">
              Read the Docs
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function LayoutDashboard(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
}
