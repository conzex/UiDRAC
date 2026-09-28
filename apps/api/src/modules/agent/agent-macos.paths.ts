/** Resolve bundled macOS agent scripts and published PKG. */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const MACOS_FILES = ['install.sh', 'uninstall.sh'] as const;

export function resolveAgentMacosFile(name: (typeof MACOS_FILES)[number]): string | null {
  const roots = [
    join(process.cwd(), 'apps/edge-agent/macos'),
    join(process.cwd(), 'agent-macos'),
    join(__dirname, '..', '..', '..', '..', 'edge-agent/macos'),
  ];
  for (const root of roots) {
    const p = join(root, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export function readAgentMacosFile(name: (typeof MACOS_FILES)[number]): string {
  const p = resolveAgentMacosFile(name);
  if (!p) {
    throw new Error(`macOS agent script missing: ${name}`);
  }
  return readFileSync(p, 'utf8');
}

export function resolveAgentMacosPkgPath(): string | null {
  const candidates = [
    join(process.cwd(), 'apps/edge-agent/macos/out/UidracAgent.pkg'),
    join(process.cwd(), 'agent-macos/UidracAgent.pkg'),
    join(__dirname, '..', '..', '..', '..', 'edge-agent/macos/out/UidracAgent.pkg'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}
