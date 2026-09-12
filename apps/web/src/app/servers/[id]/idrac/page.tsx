/** iDRAC settings page */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function IdracPage() {
  const { id } = useParams() as { id: string };
  const [network, setNetwork] = useState<any>(null);
  useEffect(() => { api.get(`/servers/${id}/network`).then((r) => setNetwork(r.data)).catch(() => {}); }, [id]);
  return (
    <div className="space-y-4">
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">iDRAC Network</h2></div>
        <div className="p-4 text-sm text-text-secondary">{network ? JSON.stringify(network.interfaces?.[0], null, 2) : 'Loading...'}</div>
      </div>
    </div>
  );
}
