'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export type FleetMetrics = {
  sampledAt: string;
  reach: { fleetDbMs: number; consoleGatewayMs: number | null };
  agents: { total: number; byStatus: Record<string, number> };
  servers: {
    total: number;
    byHealth: Record<string, number>;
    byGeneration: Record<string, number>;
    byModel: Record<string, number>;
  };
};

export type ReachHistoryPoint = {
  t: number;
  fleetMs: number;
  consoleMs: number | null;
};

const MAX_HISTORY = 36;

export function useFleetMetrics(pollMs = 8_000) {
  const [metrics, setMetrics] = useState<FleetMetrics | null>(null);
  const [history, setHistory] = useState<ReachHistoryPoint[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const genRef = useRef(0);

  const refresh = useCallback(() => {
    const gen = ++genRef.current;
    const started = performance.now();
    return api
      .get<FleetMetrics>('/dashboard/fleet-metrics')
      .then((r) => {
        if (gen !== genRef.current) return;
        const clientMs = Math.round(performance.now() - started);
        setMetrics(r.data);
        setError('');
        setHistory((prev) => {
          const fleetMs = r.data.reach.fleetDbMs ?? clientMs;
          const consoleMs = r.data.reach.consoleGatewayMs;
          const next = [...prev, { t: Date.now(), fleetMs, consoleMs }];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
      })
      .catch(() => {
        if (gen !== genRef.current) return;
        setError('Unable to load fleet metrics.');
      })
      .finally(() => {
        if (gen === genRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => {
      genRef.current += 1;
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { metrics, history, error, loading, refresh };
}
