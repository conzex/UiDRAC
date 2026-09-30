import os from 'os';

/** Best-effort primary LAN IPv4 for agent host (non-loopback). */
export function getPrimaryLanIPv4(): string | null {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      const family = typeof iface.family === 'string' ? iface.family : String(iface.family);
      if (family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}
