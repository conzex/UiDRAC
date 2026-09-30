/** Agent host IP — ignore Docker Desktop / container peer addresses. */

export function normalizeAgentIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim().replace(/^::ffff:/i, '');
  if (!v) return null;
  return v;
}

/** True when the IP is a known unreliable peer (API saw Docker bridge, not the agent host). */
export function isUnreliableAgentPeerIp(ip: string | null | undefined): boolean {
  const v = normalizeAgentIp(ip);
  if (!v) return true;
  if (v === '0.0.0.0' || v === '127.0.0.1' || v === '::1') return true;
  // Docker Desktop (Mac) host gateway seen from Linux containers
  if (v.startsWith('192.168.65.')) return true;
  if (v.startsWith('172.17.') || v.startsWith('172.18.') || v.startsWith('172.19.')) return true;
  if (v.startsWith('172.20.') || v.startsWith('172.21.') || v.startsWith('172.22.')) return true;
  if (v.startsWith('172.23.') || v.startsWith('172.24.') || v.startsWith('172.25.')) return true;
  if (v.startsWith('172.26.') || v.startsWith('172.27.') || v.startsWith('172.28.')) return true;
  if (v.startsWith('172.29.') || v.startsWith('172.30.') || v.startsWith('172.31.')) return true;
  return false;
}

/** Prefer agent-reported LAN IP over WebSocket peer IP. */
export function resolveAgentHostIp(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const n = normalizeAgentIp(c);
    if (n && !isUnreliableAgentPeerIp(n)) return n;
  }
  return null;
}
