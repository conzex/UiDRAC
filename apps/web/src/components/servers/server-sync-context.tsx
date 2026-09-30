'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ServerIdracSyncLightbox } from '@/components/servers/server-idrac-sync-lightbox';
import { syncServerFromIdrac } from '@/lib/server-summary-prefetch';

type SyncState = {
  active: boolean;
  percent: number;
  stepLabel: string;
};

type ServerSyncContextValue = {
  syncing: boolean;
  syncFromIdrac: () => Promise<void>;
};

const ServerSyncContext = createContext<ServerSyncContextValue | null>(null);

export function ServerSyncProvider({ serverId, children }: { serverId: string; children: React.ReactNode }) {
  const [sync, setSync] = useState<SyncState>({ active: false, percent: 0, stepLabel: '' });
  const inFlightRef = useRef(false);

  const syncFromIdrac = useCallback(async () => {
    if (!serverId || inFlightRef.current) return;
    inFlightRef.current = true;
    setSync({ active: true, percent: 0, stepLabel: 'Preparing…' });
    try {
      await syncServerFromIdrac(serverId, (percent, stepLabel) => {
        setSync({ active: true, percent, stepLabel });
      });
      setSync({ active: true, percent: 100, stepLabel: 'Complete' });
      await new Promise((r) => setTimeout(r, 350));
    } finally {
      inFlightRef.current = false;
      setSync({ active: false, percent: 0, stepLabel: '' });
    }
  }, [serverId]);

  const value = useMemo(
    () => ({ syncing: sync.active, syncFromIdrac }),
    [sync.active, syncFromIdrac],
  );

  return (
    <ServerSyncContext.Provider value={value}>
      {children}
      {sync.active && <ServerIdracSyncLightbox percent={sync.percent} stepLabel={sync.stepLabel} />}
    </ServerSyncContext.Provider>
  );
}

export function useServerSync() {
  const ctx = useContext(ServerSyncContext);
  if (!ctx) {
    throw new Error('useServerSync must be used within ServerSyncProvider');
  }
  return ctx;
}
