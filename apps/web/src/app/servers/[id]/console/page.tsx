/** Console page — HTML5 iframe for iDRAC 8/9, noVNC for legacy 6/7. */
'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Monitor, Maximize2, Minimize2, RefreshCw, Power, Keyboard, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function ConsolePage() {
  const { id } = useParams() as { id: string };
  const [server, setServer] = useState<any>(null);
  const [consoleUrl, setConsoleUrl] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/servers/${id}`).then((r) => setServer(r.data)).catch(() => {});
    api.get(`/servers/${id}/console-url`).then((r) => setConsoleUrl(r.data)).catch((err) => {
      setError(err?.response?.data?.message || 'Unable to get console URL.');
    });
  }, [id]);

  const isLegacy = server?.generation === 'GEN6' || server?.generation === 'GEN7';
  const genLabel = server?.generation?.replace('GEN', 'iDRAC ') ?? 'iDRAC';

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const handleLaunch = () => {
    if (consoleUrl?.url) {
      if (isLegacy) {
        setConnected(true);
      } else {
        window.open(consoleUrl.url, '_blank', 'width=1280,height=1024,toolbar=no,location=no,menubar=no');
      }
    }
  };

  const handleReconnect = () => {
    setConnected(false);
    setTimeout(() => setConnected(true), 500);
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Console Header */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-dell-blue" />
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Virtual Console</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-dell-blue/10 text-dell-blue font-medium">{genLabel}</span>
            {connected && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">Connected</span>}
          </div>
          <div className="flex gap-2">
            {connected && (
              <>
                <button onClick={handleReconnect} className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Reconnect</button>
                <button className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1"><Keyboard className="w-3 h-3" /> Send Keys</button>
                <button onClick={toggleFullscreen} className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1">
                  {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-sm text-red-critical">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="p-4">
          {connected && isLegacy ? (
            <div className="relative">
              <iframe
                ref={iframeRef}
                src={consoleUrl?.url || ''}
                className="w-full border-0 rounded bg-black"
                style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          ) : connected && !isLegacy ? (
            <div className="relative">
              <iframe
                ref={iframeRef}
                src={consoleUrl?.url || ''}
                className="w-full border-0 rounded bg-black"
                style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
                allow="clipboard-read; clipboard-write"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 rounded flex items-center justify-center max-h-[500px]">
              <div className="text-center text-white/80">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <h3 className="text-lg font-semibold mb-2">
                  {isLegacy ? 'Legacy Console' : 'HTML5 Console'}
                </h3>
                <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
                  {isLegacy
                    ? `Connect to ${genLabel} console through a noVNC bridge. The Java viewer runs inside a Docker container and streams video via WebSocket.`
                    : `Connect directly to the ${genLabel} native HTML5 console. This opens the iDRAC web console in a new window.`
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={handleLaunch} className="px-6 py-2.5 bg-dell-blue text-white rounded hover:bg-dell-blue-hover font-semibold text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    {isLegacy ? 'Launch noVNC Console' : 'Launch HTML5 Console'}
                  </button>
                  {!isLegacy && consoleUrl?.url && (
                    <button onClick={() => window.open(consoleUrl.url, '_blank')} className="px-6 py-2.5 bg-white/10 text-white rounded hover:bg-white/20 font-medium text-sm flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Open in New Tab
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Power Actions (below console) */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
          <Power className="w-4 h-4 text-dell-blue" />
          <h2 className="text-[13px] font-bold uppercase tracking-wide">Quick Power Actions</h2>
        </div>
        <div className="p-4 flex gap-3 flex-wrap">
          {[
            { action: 'on', label: 'Power On', color: 'bg-green-600 hover:bg-green-700' },
            { action: 'graceful-shutdown', label: 'Graceful Shutdown', color: 'bg-amber-500 hover:bg-amber-600' },
            { action: 'reset', label: 'Reset', color: 'bg-dell-blue hover:bg-dell-blue-hover' },
            { action: 'cycle', label: 'Power Cycle', color: 'bg-orange-500 hover:bg-orange-600' },
            { action: 'nmi', label: 'NMI (Debug)', color: 'bg-red-600 hover:bg-red-700' },
          ].map((btn) => (
            <button
              key={btn.action}
              onClick={async () => {
                try {
                  await api.post(`/servers/${id}/power`, { action: btn.action });
                } catch { /* handled elsewhere */ }
              }}
              className={`px-4 py-2 ${btn.color} text-white text-sm rounded font-medium flex items-center gap-1.5`}
            >
              <Power className="w-3.5 h-3.5" /> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Console Info */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Connection Information</h2></div>
        <div className="p-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex"><span className="w-1/2 text-text-secondary">Server</span><span className="font-medium">{server?.name || '—'}</span></div>
          <div className="flex"><span className="w-1/2 text-text-secondary">iDRAC IP</span><span className="font-mono">{server?.ip || '—'}</span></div>
          <div className="flex"><span className="w-1/2 text-text-secondary">Generation</span><span className="font-medium">{genLabel}</span></div>
          <div className="flex"><span className="w-1/2 text-text-secondary">Console Type</span><span className="font-medium">{consoleUrl?.type === 'html5' ? 'HTML5 Native' : 'noVNC Bridge'}</span></div>
        </div>
      </div>
    </div>
  );
}
