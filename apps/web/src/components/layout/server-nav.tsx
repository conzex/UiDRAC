/** server-nav.tsx — Secondary navigation for server detail pages. */
'use client';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'System', path: 'system' },
  { label: 'Storage', path: 'storage' },
  { label: 'Configuration', path: 'configuration' },
  { label: 'Maintenance', path: 'maintenance' },
  { label: 'iDRAC Settings', path: 'idrac' },
  { label: 'Console', path: 'console' },
];

export default function ServerNav({ serverId }: { serverId: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0 border-b border-border-card bg-white mb-4">
      {tabs.map((tab) => {
        const href = `/servers/${serverId}/${tab.path}`;
        const isActive = pathname?.includes(`/${tab.path}`);
        return (
          <a key={tab.path} href={href} className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            isActive ? 'border-dell-blue text-dell-blue' : 'border-transparent text-text-secondary hover:text-dell-blue hover:border-dell-blue/30'
          )}>
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
