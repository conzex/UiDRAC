'use client';

import { useEffect, useState } from 'react';
import { isServerSummariesWarming } from '@/lib/server-summary-prefetch';

export function ServerWarmBanner({ serverId }: { serverId: string }) {
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    const tick = () => setWarming(isServerSummariesWarming(serverId));
    tick();
    const t = setInterval(tick, 400);
    return () => clearInterval(t);
  }, [serverId]);

  if (!warming) return null;

  return (
    <div className="mb-3 text-xs text-dell-blue bg-blue-50 border border-blue-100 rounded px-3 py-2">
      Loading iDRAC data for all tabs (Dashboard, System, Storage, …). You can switch tabs — cached sections appear as they finish.
    </div>
  );
}
