/** Detect visitor OS for agent download recommendations (browser). */
import type { AgentPlatform } from '@/lib/agents-client';
import {
  AGENT_CDN_BASE_URL,
  agentCdnInstallerFilename,
  agentCdnInstallerUrl,
} from '@idrac/shared';

export function detectClientPlatform(): AgentPlatform {
  if (typeof navigator === 'undefined') return 'linux';
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform ?? '').toLowerCase();
  if (platform.includes('mac') || ua.includes('mac os') || ua.includes('macintosh')) return 'darwin';
  if (platform.includes('win') || ua.includes('windows')) return 'win';
  if (ua.includes('linux') || platform.includes('linux') || ua.includes('android')) return 'linux';
  return 'linux';
}

export function detectClientArch(platform: AgentPlatform): string {
  if (platform === 'darwin') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('arm64') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return 'arm64';
    }
    return 'x64';
  }
  if (platform === 'win') return 'x64';
  return 'x64';
}

export function platformLabel(id: AgentPlatform): string {
  return id === 'darwin' ? 'macOS' : id === 'win' ? 'Windows' : 'Linux';
}

export type AgentInstallGuide = {
  headline: string;
  steps: string[];
  commands: string[];
  installerUrl: string;
  installerName: string;
  note?: string;
};

export function getAgentInstallGuide(platform: AgentPlatform, cdnBase = AGENT_CDN_BASE_URL): AgentInstallGuide {
  const installerUrl = agentCdnInstallerUrl(platform, cdnBase);
  const installerName = agentCdnInstallerFilename(platform);
  const creds = './credentials.json';

  if (platform === 'darwin') {
    return {
      headline: 'macOS — PKG + credentials',
      installerUrl,
      installerName,
      steps: [
        'Download tenant credentials.json from this page (bound to your agent).',
        'Run the commands below in Terminal (installer is fetched from Conzex CDN).',
        'In the portal, open Agents and confirm Connected.',
      ],
      commands: [
        `curl -fsSL -o ${installerName} "${installerUrl}"`,
        `sudo installer -pkg ${installerName} -target /`,
        `sudo "/Library/Application Support/Conzex/UiDRAC Agent/install.sh" --config "$(pwd)/${creds}"`,
      ],
      note: 'Or double-click the PKG in Finder, then run install.sh with your credentials.json path.',
    };
  }
  if (platform === 'win') {
    return {
      headline: 'Windows — EXE + credentials',
      installerUrl,
      installerName,
      steps: [
        'Download credentials.json from this page.',
        'Run PowerShell as Administrator and paste the commands below.',
        'Confirm Connected under Agents.',
      ],
      commands: [
        `curl.exe -fsSL -o ${installerName} "${installerUrl}"`,
        `Start-Process -Wait -FilePath ".\\${installerName}"`,
        'powershell -ExecutionPolicy Bypass -File "$env:ProgramFiles\\Conzex\\UiDRAC Agent\\install.ps1" -Config "$(pwd)\\credentials.json"',
      ],
      note: 'Place credentials.json in the same folder before running install.ps1, or pass the full path to -Config.',
    };
  }
  return {
    headline: 'Linux — install script + credentials',
    installerUrl,
    installerName,
    steps: [
      'Download credentials.json from this page.',
      'On the agent host, run the commands below (Node.js 20+ required).',
      'Confirm Connected under Agents.',
    ],
    commands: [
      `curl -fsSL -o ${installerName} "${installerUrl}"`,
      `chmod +x ${installerName}`,
      `sudo ./${installerName} --config "$(pwd)/${creds}"`,
    ],
    note: 'The install script registers a systemd service (uidrac-agent).',
  };
}
