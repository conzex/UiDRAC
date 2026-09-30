/** Public agent installers hosted on Conzex CDN (filename only under /uidrac/agent/). */
import type { UidracAgentPlatform } from './agent-bundle';

export const AGENT_CDN_BASE_URL =
  (typeof process !== 'undefined' && process.env?.AGENT_CDN_BASE_URL?.replace(/\/$/, '')) ||
  'https://cdn.conzex.com/uidrac/agent';

/** Installer filenames on CDN — agent name + extension only. */
export const AGENT_CDN_INSTALLER: Record<UidracAgentPlatform, string> = {
  darwin: 'UidracAgent.pkg',
  win: 'UidracAgentSetup.exe',
  linux: 'UidracAgent-linux.sh',
};

export function agentCdnInstallerUrl(platform: UidracAgentPlatform, baseUrl = AGENT_CDN_BASE_URL): string {
  const file = AGENT_CDN_INSTALLER[platform];
  return `${baseUrl.replace(/\/$/, '')}/${file}`;
}

export function agentCdnInstallerFilename(platform: UidracAgentPlatform): string {
  return AGENT_CDN_INSTALLER[platform];
}
