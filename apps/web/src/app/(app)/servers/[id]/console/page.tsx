/** Console page — HTML5 iframe for iDRAC 8/9, noVNC for legacy 6/7. Real-time embedded console. */
'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Monitor, Maximize2, Minimize2, RefreshCw, Keyboard, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import api from '@/lib/api';

export default function ConsolePage() {
  const { id } = useParams() as { id: string };
  const [server, setServer] = useState<any>(null);
  const [consoleUrl, setConsoleUrl] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      api.get(`/servers/${id}`).then((r) => setServer(r.data)),
      api.get(`/servers/${id}/console-url`).then((r) => setConsoleUrl(r.data)),
    ]).then((results) => {
      if (results[1].status === 'rejected') {
        const err = (results[1] as PromiseRejectedResult).reason;
        setError(err?.response?.data?.message || 'Unable to get console URL from iDRAC.');
      }
      setLoading(false);
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
    if (!consoleUrl?.url) return;
    if (isLegacy) {
      setConnected(true);
    } else {
      window.open(consoleUrl.url, `idrac-console-${id}`, 'width=1280,height=1024,toolbar=no,location=yes,menubar=no,resizable=yes,scrollbars=yes');
      setConnected(true);
    }
  };

  const handleReconnect = () => {
    setConnected(false);
    setTimeout(() => setConnected(true), 300);
  };

  const handleOpenExternal = () => {
    if (consoleUrl?.url) {
      window.open(consoleUrl.url, '_blank', 'width=1280,height=1024,toolbar=no,location=no,menubar=no');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-border-card rounded p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="aspect-video bg-gray-200 rounded max-h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0" ref={containerRef}>
      <div className="bg-white border border-border-card rounded">
        {/* Console Header */}
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-dell-blue" />
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Virtual Console</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-dell-blue/10 text-dell-blue font-medium">{genLabel}</span>
            {connected && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">Connected</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Info icon with tooltip */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                className="p-1.5 text-text-secondary hover:text-dell-blue transition-colors rounded hover:bg-gray-100"
              >
                <Info className="w-4 h-4" />
              </button>
              {showInfo && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-border-card rounded shadow-lg p-3 w-56 z-50 text-xs">
                  <div className="font-semibold text-text-primary mb-2">Connection Information</div>
                  <div className="space-y-1.5 text-text-secondary">
                    <div className="flex justify-between"><span>Server</span><span className="font-medium text-text-primary">{server?.name || '--'}</span></div>
                    <div className="flex justify-between"><span>iDRAC IP</span><span className="font-mono text-text-primary">{server?.ip || '--'}</span></div>
                    <div className="flex justify-between"><span>Generation</span><span className="font-medium text-text-primary">{genLabel}</span></div>
                    <div className="flex justify-between"><span>Console Type</span><span className="font-medium text-text-primary">{isLegacy ? 'noVNC Bridge' : 'HTML5 Native'}</span></div>
                  </div>
                </div>
              )}
            </div>
            {connected && (
              <>
                <button onClick={handleReconnect} className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1 transition-colors"><RefreshCw className="w-3 h-3" /> Reconnect</button>
                <button className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1 transition-colors"><Keyboard className="w-3 h-3" /> Send Keys</button>
                <button onClick={toggleFullscreen} className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1 transition-colors">
                  {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                <button onClick={handleOpenExternal} className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1 transition-colors"><ExternalLink className="w-3 h-3" /> New Window</button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-sm text-red-critical">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Console Viewport */}
        <div className="p-0">
          {connected && isLegacy ? (
            <iframe
              ref={iframeRef}
              src={consoleUrl?.url || ''}
              className="w-full border-0 bg-black"
              style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 200px)', minHeight: '500px' }}
              allow="clipboard-read; clipboard-write; autoplay"
            />
          ) : connected && !isLegacy ? (
            <div className="bg-gray-900 flex items-center justify-center py-20">
              <div className="text-center text-white/80">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-green-400/60" />
                <h3 className="text-lg font-semibold mb-2 text-green-400">Console Session Active</h3>
                <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                  The {genLabel} HTML5 console is running in a separate browser window.<br />
                  If the window did not open, check your browser pop-up blocker settings.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={handleOpenExternal} className="px-5 py-2 bg-dell-blue text-white rounded hover:bg-dell-blue-hover font-semibold text-sm flex items-center gap-2 transition-colors">
                    <ExternalLink className="w-4 h-4" /> Reopen Console Window
                  </button>
                  <button onClick={() => setConnected(false)} className="px-5 py-2 bg-white/10 text-white rounded hover:bg-white/20 font-medium text-sm transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 flex items-center justify-center max-h-[600px]">
              <div className="text-center text-white/80">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-lg font-semibold mb-2">
                  {isLegacy ? 'Legacy Console (noVNC)' : 'HTML5 Console'}
                </h3>
                <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                  {isLegacy
                    ? `Connect to ${genLabel} via a noVNC bridge running inside a Docker container.`
                    : `Connect to the ${genLabel} native HTML5 console. The console loads directly in this page.`
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleLaunch}
                    disabled={!consoleUrl?.url}
                    className="px-6 py-2.5 bg-dell-blue text-white rounded hover:bg-dell-blue-hover font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Monitor className="w-4 h-4" />
                    {isLegacy ? 'Launch noVNC Console' : 'Launch HTML5 Console'}
                  </button>
                  {!isLegacy && consoleUrl?.url && (
                    <button onClick={handleOpenExternal} className="px-6 py-2.5 bg-white/10 text-white rounded hover:bg-white/20 font-medium text-sm flex items-center gap-2 transition-colors">
                      <ExternalLink className="w-4 h-4" /> Open in New Window
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
