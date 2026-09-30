'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, RefreshCw, AlertTriangle, Info, Maximize2, Minimize2 } from 'lucide-react';
import api from '@/lib/api';
import { ServerTabPreloader } from '@/components/servers/server-tab-preloader';
import { ServerTabError } from '@/components/servers/server-tab-error';
import type { ServerConsoleLaunch } from '@idrac/shared';

const SESSION_KEY = (serverId: string) => `uidrac:console:${serverId}`;

type Props = {
  serverId: string;
  server?: { name?: string; ip?: string; generation?: string; credentialsMode?: string };
};

export function ServerConsolePanel({ serverId, server }: Props) {
  const [launch, setLaunch] = useState<ServerConsoleLaunch | null>(null);
  const [connected, setConnected] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);

  const gen = server?.generation ?? launch?.generation?.replace('GEN', '') ?? '9';
  const isLegacy = server?.generation === 'GEN6' || server?.generation === 'GEN7';
  const genLabel = server?.generation?.replace('GEN', 'iDRAC ') ?? `iDRAC ${gen}`;

  const markSessionActive = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY(serverId), JSON.stringify({ active: true, at: Date.now() }));
  }, [serverId]);

  const beginConsole = useCallback((data: ServerConsoleLaunch) => {
    if (!data.url) return;
    setLaunch(data);
    setIframeSrc(data.url);
    setConnected(true);
    setError('');
    markSessionActive();
  }, [markSessionActive]);

  const loadLaunch = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get<ServerConsoleLaunch>(`/servers/${serverId}/console/launch`);
      setLaunch(data);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to prepare virtual console.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  const startConsole = useCallback(
    async (refresh = false) => {
      const data = refresh ? await loadLaunch() : launch ?? (await loadLaunch());
      if (!data?.url) return;
      if (!isLegacy && data.hasSavedCredentials && !data.authenticated) {
        setError(
          'Could not open a signed-in iDRAC session. Re-add the server with saved credentials or retry in a moment.',
        );
      }
      beginConsole(data);
    },
    [beginConsole, isLegacy, launch, loadLaunch],
  );

  useEffect(() => {
    autoStartedRef.current = false;
    setLoading(true);
    setConnected(false);
    setIframeSrc(null);
    void loadLaunch().then((data) => {
      if (!data) return;
      const stored = sessionStorage.getItem(SESSION_KEY(serverId));
      let wasActive = false;
      try {
        wasActive = Boolean(stored && JSON.parse(stored).active);
      } catch {
        wasActive = false;
      }
      const shouldAuto = data.autoLaunch || wasActive;
      if (shouldAuto && !autoStartedRef.current) {
        autoStartedRef.current = true;
        beginConsole(data);
      }
    });
  }, [serverId, loadLaunch, beginConsole]);

  const handleDisconnect = async () => {
    try {
      await api.delete(`/servers/${serverId}/console/session`);
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem(SESSION_KEY(serverId));
    setConnected(false);
    setIframeSrc(null);
  };

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

  const frameHeight = isFullscreen ? '100vh' : 'calc(100vh - 220px)';

  if (loading) return <ServerTabPreloader tab="console" />;

  if (error && !launch) {
    return <ServerTabError message={error} onRetry={() => void loadLaunch()} />;
  }

  return (
    <div className="space-y-0" ref={containerRef}>
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-dell-blue" />
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Virtual Console</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-dell-blue/10 text-dell-blue font-medium">{genLabel}</span>
            {connected && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">Connected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
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
                    <div className="flex justify-between">
                      <span>Server</span>
                      <span className="font-medium text-text-primary">{launch?.serverName || server?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>iDRAC IP</span>
                      <span className="font-mono text-text-primary">{launch?.serverIp || server?.ip || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Console Type</span>
                      <span className="font-medium text-text-primary">{isLegacy ? 'noVNC Bridge' : 'HTML5 Native'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credentials</span>
                      <span className="font-medium text-text-primary">
                        {launch?.hasSavedCredentials ? 'Saved (auto)' : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {connected && (
              <>
                <button
                  type="button"
                  onClick={() => void startConsole(true)}
                  className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reconnect
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1"
                >
                  {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  className="px-2.5 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200"
                >
                  Disconnect
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

        <div className="p-0">
          {connected && iframeSrc ? (
            <iframe
              title={`${genLabel} Virtual Console`}
              src={iframeSrc}
              className="w-full border-0 bg-black"
              style={{ height: frameHeight, minHeight: '500px' }}
              allow="clipboard-read; clipboard-write; autoplay; fullscreen"
            />
          ) : (
            <div className="aspect-video bg-gray-900 flex items-center justify-center max-h-[600px] min-h-[420px]">
              <div className="text-center text-white/80 px-4">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-lg font-semibold mb-2">
                  {isLegacy ? 'Legacy Console (noVNC)' : 'HTML5 Console'}
                </h3>
                <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                  {launch?.hasSavedCredentials
                    ? `Open the ${genLabel} console here using your saved iDRAC session (no separate login).`
                    : isLegacy
                      ? `Connect to ${genLabel} via the noVNC bridge.`
                      : `Connect to the ${genLabel} HTML5 console in this tab. Saved credentials skip the iDRAC login screen.`}
                </p>
                <button
                  type="button"
                  onClick={() => void startConsole(true)}
                  disabled={!launch?.url && loading}
                  className="px-6 py-2.5 bg-dell-blue text-white rounded hover:bg-dell-blue-hover font-semibold text-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <Monitor className="w-4 h-4" />
                  {isLegacy ? 'Launch noVNC Console' : 'Launch HTML5 Console'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
