'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { getSessionSummary, setSessionSummary } from '@/lib/server-summary-session-cache';
import { subscribeServerWarm } from '@/lib/server-summary-prefetch';

function serverIdFromSummaryUrl(url: string): string | null {
  const m = /^\/servers\/([^/]+)\/summary\//.exec(url);
  return m?.[1] ?? null;
}

function errorMessage(err: unknown): string {
  if (axios.isCancel(err)) return '';
  const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
  if (e?.response?.data?.message) return String(e.response.data.message);
  if (e?.response?.status === 500 || e?.response?.status === 502) {
    return 'Could not load iDRAC data right now. Cached data is shown when available — use Sync from iDRAC or retry in a moment.';
  }
  if (e?.response?.status === 503) {
    return String(e.response?.data?.message || 'UiDRAC agent is not connected. Open Agents and confirm Connected.');
  }
  if (e?.response?.status === 504) return String(e.response?.data?.message || 'Request timed out — iDRAC or agent is busy.');
  return e?.message || 'Failed to load data.';
}

function summaryUrl(base: string, refresh: boolean) {
  return refresh ? `${base}${base.includes('?') ? '&' : '?'}refresh=true` : base;
}

export function useServerSummary<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const genRef = useRef(0);

  const fetchSummary = useCallback(
    (refresh: boolean) => {
      if (!url) return;
      const gen = ++genRef.current;
      const requestUrl = summaryUrl(url, refresh);

      if (!refresh) {
        const hit = getSessionSummary<T>(url);
        if (hit) {
          setData(hit);
          const at = (hit as { cachedAt?: string }).cachedAt;
          if (at) setCachedAt(at);
          setLoading(false);
          setError('');
          return;
        }
      }

      setLoading(true);
      setError('');
      api
        .get<T>(requestUrl)
        .then((r) => {
          if (gen !== genRef.current) return;
          setSessionSummary(url, r.data);
          setData(r.data);
          const at = (r.data as { cachedAt?: string })?.cachedAt;
          if (at) setCachedAt(at);
        })
        .catch((err) => {
          if (gen !== genRef.current) return;
          const msg = errorMessage(err);
          if (msg) setError(msg);
        })
        .finally(() => {
          if (gen === genRef.current) setLoading(false);
        });
    },
    [url],
  );

  const reload = useCallback(() => fetchSummary(true), [fetchSummary]);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    fetchSummary(false);
    const serverId = serverIdFromSummaryUrl(url);
    const unsub = serverId
      ? subscribeServerWarm(serverId, () => {
          const hit = getSessionSummary<T>(url);
          if (hit) {
            setData(hit);
            setLoading(false);
            setError('');
            const at = (hit as { cachedAt?: string }).cachedAt;
            if (at) setCachedAt(at);
          }
        })
      : undefined;
    return () => {
      genRef.current += 1;
      unsub?.();
    };
  }, [url, fetchSummary]);

  return { data, loading, error, reload, cachedAt };
}
