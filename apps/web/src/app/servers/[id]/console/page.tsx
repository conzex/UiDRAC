/** Console page — iframe for HTML5 or noVNC canvas for legacy. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function ConsolePage() {
  const { id } = useParams() as { id: string };
  const [server, setServer] = useState<any>(null);
  useEffect(() => { api.get(`/servers/${id}`).then((r) => setServer(r.data)).catch(() => {}); }, [id]);

  const isLegacy = server?.generation === 'GEN6' || server?.generation === 'GEN7';

  return (
    <div className="bg-white border border-border-card rounded">
      <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-wide">Virtual Console</h2>
        <span className="text-xs text-text-secondary">{isLegacy ? 'noVNC Bridge' : 'HTML5 Native'}</span>
      </div>
      <div className="p-4">
        {isLegacy ? (
          <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
            <div className="text-center text-white/70">
              <p className="text-lg mb-2">Legacy Console (iDRAC {server?.generation?.replace('GEN', '')})</p>
              <p className="text-sm mb-4">This will launch a Java viewer inside a Docker container and stream via noVNC.</p>
              <button className="px-6 py-2 bg-dell-blue text-white rounded hover:bg-dell-blue-hover">Launch noVNC Console</button>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
            <div className="text-center text-white/70">
              <p className="text-lg mb-2">HTML5 Console</p>
              <p className="text-sm mb-4">Connect to iDRAC native HTML5 console.</p>
              <button onClick={() => window.open(`https://${server?.ip}/console/console.html`, '_blank')} className="px-6 py-2 bg-dell-blue text-white rounded hover:bg-dell-blue-hover">Launch HTML5 Console</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
