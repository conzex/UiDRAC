/** Detect visitor OS for agent download recommendations (browser). */
import type { AgentPlatform } from '@/lib/agents-client';

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
  note?: string;
};

export function getAgentInstallGuide(platform: AgentPlatform): AgentInstallGuide {
  if (platform === 'darwin') {
    return {
      headline: 'Install on macOS (Terminal)',
      steps: [
        'Unzip the macOS ZIP on the Mac that will run the agent (keep only one folder in Downloads).',
        'In Terminal, cd into that folder (use the exact folder name from Finder).',
        'Run the three commands below — each line is safe to paste as-is after you cd.',
        'Confirm Connected on the Agents page in the portal.',
      ],
      commands: [
        'cd ~/Downloads/REPLACE_WITH_YOUR_UNZIPPED_FOLDER',
        'sudo installer -pkg "$PWD/UidracAgent.pkg" -target /',
        'sudo "$PWD/install.sh" --config "$PWD/credentials.json"',
      ],
      note:
        'Replace the cd path with your unzipped folder name if different. Easiest: double-click Install-UiDRAC-Agent.command in the ZIP.',
    };
  }
  if (platform === 'win') {
    return {
      headline: 'Install on Windows (PowerShell as Administrator)',
      steps: [
        'Download and unzip the Windows ZIP on the server that will run the agent.',
        'Open PowerShell as Administrator in that folder.',
        'Run the command below, then confirm Connected under Agents.',
      ],
      commands: ['powershell -ExecutionPolicy Bypass -File .\\Install-UiDRAC-Agent.ps1'],
      note: 'You can also run UidracAgentSetup.exe from the ZIP, then point it at credentials.json.',
    };
  }
  return {
    headline: 'Install on Linux (root shell)',
    steps: [
      'Download and unzip the Linux ZIP on the host.',
      'Install Node.js 20+ if needed, then run the install script as root.',
      'Confirm Connected under Agents in the portal.',
    ],
    commands: [
      'cd ~/Downloads/UidracAgent-linux-YOURFOLDER',
      'sudo bash install-linux.sh',
    ],
    note: 'The agent runs as a systemd service (uidrac-agent).',
  };
}
