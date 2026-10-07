/** Resolve bundled Windows agent scripts (dev monorepo + Docker COPY). */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cdnAgentFile } from './agent-cdn.paths';

const WINDOWS_FILES = ['install.ps1', 'uninstall.ps1'] as const;

export function resolveAgentWindowsFile(name: (typeof WINDOWS_FILES)[number]): string | null {
  const roots = [
    join(process.cwd(), 'apps/edge-agent/windows'),
    join(process.cwd(), 'agent-windows'),
    join(__dirname, '..', '..', '..', '..', 'edge-agent/windows'),
  ];
  for (const root of roots) {
    const p = join(root, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export function readAgentWindowsFile(name: (typeof WINDOWS_FILES)[number]): string {
  const p = resolveAgentWindowsFile(name);
  if (!p) {
    throw new Error(`Windows agent script missing: ${name} (expected under apps/edge-agent/windows/)`);
  }
  return readFileSync(p, 'utf8');
}

export function resolveAgentMsiPath(): string | null {
  const candidates = [
    cdnAgentFile('uidrac-agent-setup.msi'),
    join(process.cwd(), 'apps/edge-agent/installer/out/uidrac-agent-setup.msi'),
    join(process.cwd(), 'agent-windows/uidrac-agent-setup.msi'),
    join(__dirname, '..', '..', '..', '..', 'edge-agent/installer/out/uidrac-agent-setup.msi'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function resolveAgentSetupExePath(): string | null {
  const candidates = [
    cdnAgentFile('UidracAgentSetup.exe'),
    join(process.cwd(), 'apps/edge-agent/installer/out/UidracAgentSetup.exe'),
    join(process.cwd(), 'agent-windows/UidracAgentSetup.exe'),
    join(__dirname, '..', '..', '..', '..', 'edge-agent/installer/out/UidracAgentSetup.exe'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}
