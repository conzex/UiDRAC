/** Server detail layout — chrome for /servers/[id]/* pages. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServerNav from '@/components/layout/server-nav';
import { ServerWarmBanner } from '@/components/servers/server-warm-banner';
import { ServerSyncProvider } from '@/components/servers/server-sync-context';
import api from '@/lib/api';
import { warmServerSummaries } from '@/lib/server-summary-prefetch';

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params?.id as string;
  const [server, setServer] = useState<any>(null);

  useEffect(() => {
    if (id) api.get(`/servers/${id}`).then((r) => setServer(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void warmServerSummaries(id, false);
  }, [id]);

  const genColors: Record<string, string> = { GEN6: 'bg-gray-500', GEN7: 'bg-amber-warning', GEN8: 'bg-blue-500', GEN9: 'bg-dell-blue' };

  return (
    <ServerSyncProvider serverId={id}>
      {server && (
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">{server.name}</h1>
          <span className="text-sm text-text-secondary">{server.ip}</span>
          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${genColors[server.generation] || 'bg-gray-400'}`}>
            {server.generation?.replace('GEN', 'iDRAC ')}
          </span>
        </div>
      )}
      <ServerNav serverId={id} server={server} />
      <ServerWarmBanner serverId={id} />
      {children}
    </ServerSyncProvider>
  );
}
