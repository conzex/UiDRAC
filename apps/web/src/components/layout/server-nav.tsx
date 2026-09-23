/** server-nav.tsx — Server detail navigation with power actions and info tooltip. */
'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, HardDrive, Settings, Wrench, Shield, Monitor,
  Power, ChevronDown, Zap, RotateCw, PowerOff, AlertTriangle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { readStoredUser } from '@/lib/auth-client';
import { canMutateServers } from '@/lib/rbac';

const tabs = [
  { label: 'Dashboard', path: 'dashboard', Icon: LayoutDashboard },
  { label: 'System', path: 'system', Icon: Server },
  { label: 'Storage', path: 'storage', Icon: HardDrive },
  { label: 'Configuration', path: 'configuration', Icon: Settings },
  { label: 'Maintenance', path: 'maintenance', Icon: Wrench },
  { label: 'iDRAC Settings', path: 'idrac', Icon: Shield },
  { label: 'Console', path: 'console', Icon: Monitor },
];

const powerActions = [
  { action: 'on', label: 'Power On', Icon: Power, color: 'text-green-600 hover:bg-green-50' },
  { action: 'graceful-shutdown', label: 'Graceful Shutdown', Icon: PowerOff, color: 'text-amber-600 hover:bg-amber-50' },
  { action: 'reset', label: 'Reset System', Icon: RotateCw, color: 'text-blue-600 hover:bg-blue-50' },
  { action: 'power-cycle', label: 'Power Cycle', Icon: Zap, color: 'text-orange-600 hover:bg-orange-50' },
  { action: 'nmi', label: 'NMI (Debug)', Icon: AlertTriangle, color: 'text-red-600 hover:bg-red-50' },
];

export default function ServerNav({ serverId, server }: { serverId: string; server?: any }) {
  const pathname = usePathname();
  const [powerOpen, setPowerOpen] = useState(false);
  const [powerMsg, setPowerMsg] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setPowerOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPowerOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc); };
  }, []);

  const doPowerAction = async (action: string, label: string) => {
    setPowerOpen(false);
    try {
      await api.post(`/servers/${serverId}/power`, { action });
      setPowerMsg(`${label} command sent successfully`);
    } catch (err: any) {
      setPowerMsg(`Failed: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    }
    setTimeout(() => setPowerMsg(''), 4000);
  };

  const genLabel = server?.generation?.replace('GEN', 'iDRAC ') ?? 'iDRAC';
  const canPower = canMutateServers(readStoredUser()?.role);

  return (
    <div className="mb-4">
      <nav className="flex items-center border-b border-border-card bg-white">
        <div className="flex gap-0 flex-1 overflow-x-auto">
          {tabs.map((tab) => {
            const href = `/servers/${serverId}/${tab.path}`;
            const isActive = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <a key={tab.path} href={href} className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                isActive ? 'border-dell-blue text-dell-blue' : 'border-transparent text-text-secondary hover:text-dell-blue hover:border-dell-blue/30'
              )}>
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
              </a>
            );
          })}
        </div>

        {/* Right side: Info + Power */}
        <div className="flex items-center gap-1.5 shrink-0 px-2">
          {/* Info tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              className="p-1.5 text-text-secondary hover:text-dell-blue transition-colors rounded hover:bg-gray-100"
              title="Connection Information"
            >
              <Info className="w-4 h-4" />
            </button>
            {showInfo && server && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-border-card rounded shadow-lg p-3 w-56 z-50 text-xs">
                <div className="font-semibold text-text-primary mb-2">Connection Information</div>
                <div className="space-y-1.5 text-text-secondary">
                  <div className="flex justify-between"><span>Server</span><span className="font-medium text-text-primary">{server.name}</span></div>
                  <div className="flex justify-between"><span>iDRAC IP</span><span className="font-mono text-text-primary">{server.ip}</span></div>
                  <div className="flex justify-between"><span>Generation</span><span className="font-medium text-text-primary">{genLabel}</span></div>
                  <div className="flex justify-between"><span>Health</span><span className="font-medium text-text-primary capitalize">{server.health?.toLowerCase()}</span></div>
                  {server.serviceTag && <div className="flex justify-between"><span>Service Tag</span><span className="font-mono text-text-primary">{server.serviceTag}</span></div>}
                </div>
              </div>
            )}
          </div>

          {canPower && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setPowerOpen(!powerOpen)}
              className="px-3 py-1.5 bg-dell-blue text-white text-xs font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" /> Power <ChevronDown className={cn('w-3 h-3 transition-transform', powerOpen && 'rotate-180')} />
            </button>
            {powerOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-border-card rounded shadow-lg py-1 w-52 z-50">
                {powerActions.map((pa) => (
                  <button
                    key={pa.action}
                    onClick={() => doPowerAction(pa.action, pa.label)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${pa.color}`}
                  >
                    <pa.Icon className="w-3.5 h-3.5" /> {pa.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </nav>
      {powerMsg && (
        <div className={`mt-2 text-xs px-3 py-2 rounded ${powerMsg.startsWith('Failed') ? 'bg-red-50 text-red-critical' : 'bg-green-50 text-green-700'}`}>
          {powerMsg}
        </div>
      )}
    </div>
  );
}
