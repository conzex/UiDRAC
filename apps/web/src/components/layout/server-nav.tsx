/** server-nav.tsx — Secondary navigation for server detail pages. */
'use client';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, HardDrive, Settings, Wrench, Shield, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Dashboard', path: 'dashboard', Icon: LayoutDashboard },
  { label: 'System', path: 'system', Icon: Server },
  { label: 'Storage', path: 'storage', Icon: HardDrive },
  { label: 'Configuration', path: 'configuration', Icon: Settings },
  { label: 'Maintenance', path: 'maintenance', Icon: Wrench },
  { label: 'iDRAC Settings', path: 'idrac', Icon: Shield },
  { label: 'Console', path: 'console', Icon: Monitor },
];

export default function ServerNav({ serverId }: { serverId: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0 border-b border-border-card bg-white mb-4">
      {tabs.map((tab) => {
        const href = `/servers/${serverId}/${tab.path}`;
        const isActive = pathname?.endsWith(`/${tab.path}`) || pathname?.includes(`/${tab.path}/`);
        return (
          <a key={tab.path} href={href} className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
            isActive ? 'border-dell-blue text-dell-blue' : 'border-transparent text-text-secondary hover:text-dell-blue hover:border-dell-blue/30'
          )}>
            <tab.Icon className="w-3.5 h-3.5" />
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
