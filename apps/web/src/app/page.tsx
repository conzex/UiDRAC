/** Landing page — Hero section with features and CTA. Styled to match internal panel. */
'use client';
import { useEffect, useState } from 'react';
import { Server, Shield, Zap, Monitor, Globe, Lock, BarChart3, Wrench, Cpu, HardDrive, Thermometer, BookOpen, ArrowRight, CheckCircle, LayoutDashboard } from 'lucide-react';
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-dell-blue via-dell-blue to-dell-dark text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <img src="/logo.png" alt="iDRAC Console" className="h-14 mx-auto brightness-0 invert mb-6" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Universal iDRAC Console
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto mb-8">
            Zero-client-install, Docker-hosted web platform for managing Dell PowerEdge servers
            across all iDRAC generations — from legacy iDRAC 6 to modern iDRAC 9.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isLoggedIn ? (
              <a href="/dashboard" className="px-5 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <>
                <a href="/register" className="px-5 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </a>
                <a href="/login" className="px-5 py-2.5 bg-white/20 text-white text-sm font-semibold rounded hover:bg-white/30 transition-colors border border-white/30 inline-flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Generation Support */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-text-primary text-center mb-2">All Generations. One Platform.</h2>
          <p className="text-sm text-text-secondary text-center mb-8 max-w-2xl mx-auto">Automatic protocol detection adapts to each iDRAC generation — Redfish REST API for modern, legacy XML/CGI for older hardware.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {generations.map((g) => (
              <div key={g.gen} className="bg-white border border-border-card rounded p-5 text-center hover:border-dell-blue hover:shadow-md transition-all">
                <div className={`inline-flex w-10 h-10 rounded ${g.color} text-white items-center justify-center mb-3`}>
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">{g.gen}</h3>
                <p className="text-xs text-text-secondary mb-1">{g.protocol}</p>
                <p className="text-[11px] text-text-secondary">{g.servers}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 bg-bg-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-text-primary text-center mb-2">Everything You Need</h2>
          <p className="text-sm text-text-secondary text-center mb-8 max-w-2xl mx-auto">Full-featured iDRAC management with every capability of the native web console — and more.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-border-card rounded hover:border-dell-blue hover:shadow-md transition-all">
                <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
                  <f.Icon className="w-4 h-4 text-dell-blue" />
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

      {/* Why Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl font-bold text-text-primary text-center mb-8">Why Universal iDRAC Console?</h2>
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Key Benefits</h3>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                'No client-side Java, ActiveX, or browser plugins required',
                'Works with every Dell PowerEdge server from 11th to 16th generation',
                'Docker-hosted — deploy anywhere in minutes',
                'Multi-tenant with full RBAC and audit logging',
                'Session timeout with automatic logout for security',
                'AES-256-GCM encrypted credential storage',
                'Real-time sensor monitoring and alerting',
                'Server Configuration Profile export/import',
              ].map((item, i) => (
                <div key={item} className={`flex items-center gap-3 py-1.5 px-2 rounded ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                  <CheckCircle className="w-4 h-4 text-green-healthy shrink-0" />
                  <span className="text-sm text-text-primary">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-dell-blue text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl font-bold mb-3">Ready to Manage Your Fleet?</h2>
          <p className="text-sm text-white/80 mb-6">Get started in minutes. No client software required.</p>
          <div className="flex gap-3 justify-center">
            <a href={isLoggedIn ? '/dashboard' : '/register'} className="px-5 py-2.5 bg-white text-dell-blue text-sm font-semibold rounded hover:bg-white/90 transition-colors inline-flex items-center gap-2">
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/docs" className="px-5 py-2.5 bg-white/20 text-white text-sm font-semibold rounded border border-white/30 hover:bg-white/30 transition-colors inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Read the Docs
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
