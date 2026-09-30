/** Build tenant-locked agent installer ZIP (credentials + platform files). */
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';
import { createHash } from 'crypto';
import { ZipArchive } from 'archiver';
import type { Archiver } from 'archiver';
import { resolveAgentMacosPkgPath } from './agent-macos.paths';
import { resolveAgentMsiPath, resolveAgentSetupExePath } from './agent-windows.paths';
import type { UidracAgentPlatform } from '@idrac/shared';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

function repoPath(...parts: string[]) {
  const fromCwd = join(process.cwd(), ...parts);
  if (existsSync(fromCwd)) return fromCwd;
  return join(REPO_ROOT, ...parts);
}

function addFileIfExists(archive: Archiver, diskPath: string, zipPath: string) {
  if (existsSync(diskPath)) {
    archive.file(diskPath, { name: zipPath });
    return true;
  }
  return false;
}

export async function buildAgentInstallerZip(
  platform: UidracAgentPlatform,
  credentialsJson: string,
  tenantSlug: string,
  agentPublicId?: string,
): Promise<{ filename: string; stream: PassThrough; sha256: string }> {
  const safeSlug = tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '') || 'tenant';
  const idSuffix = agentPublicId ? `-${agentPublicId.slice(0, 8)}` : '';
  const filename =
    platform === 'darwin'
      ? `UidracAgent-macos-${safeSlug}${idSuffix}.zip`
      : platform === 'win'
        ? `UidracAgent-windows-${safeSlug}${idSuffix}.zip`
        : `UidracAgent-linux-${safeSlug}${idSuffix}.zip`;

  const sha256 = createHash('sha256').update(credentialsJson).digest('hex');

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.on('error', (err) => stream.destroy(err));
  archive.pipe(stream);

  archive.append(credentialsJson, { name: 'credentials.json' });

  const readme = `Conzex UiDRAC Agent — tenant-locked installer package
Copyright (c) 2026 Conzex Global Private Limited

credentials.json is bound to YOUR account only. Do not share.

macOS (one Terminal command):
  1. Unzip the download on your Mac.
  2. cd into the unzipped folder, then run:
     sudo ./install-macos-agent.sh
  (Uses credentials.json in the folder; installs PKG if present, registers boot service.)
  3. Portal → Agents → refresh until Connected

Windows:
  1. Run Install-UiDRAC-Agent.ps1 as Administrator
  2. Portal → Agents → manage this connector for the UiDRAC Agent console

Linux:
  1. sudo ./install-linux.sh
  2. Portal → Agents → manage this connector for the UiDRAC Agent console
`;
  archive.append(readme, { name: 'README.txt' });

  if (platform === 'darwin') {
    const pkg = resolveAgentMacosPkgPath();
    if (pkg) addFileIfExists(archive, pkg, 'UidracAgent.pkg');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/install-macos-agent.sh'), 'install-macos-agent.sh');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/install.sh'), 'install.sh');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/uninstall.sh'), 'uninstall.sh');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/repair-local-connection.sh'), 'repair-local-connection.sh');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/uidrac-agent'), 'uidrac-agent');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/agent-bundle.cjs'), 'agent-bundle.cjs');
    archive.append(
      `#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/install-macos-agent.sh"
`,
      { name: 'Install-UiDRAC-Agent.command', mode: 0o755 },
    );
  } else if (platform === 'win') {
    const setup = resolveAgentSetupExePath();
    const msi = resolveAgentMsiPath();
    if (setup) addFileIfExists(archive, setup, 'UidracAgentSetup.exe');
    if (msi) addFileIfExists(archive, msi, 'uidrac-agent-setup.msi');
    const winDir = repoPath('apps/edge-agent/windows');
    for (const f of ['agent-bundle.cjs', 'run-uidrac-agent.cmd', 'install.ps1', 'uninstall.ps1', 'nssm.exe']) {
      addFileIfExists(archive, join(winDir, f), f);
    }
    archive.append(
      `$ErrorActionPreference = 'Stop'
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Installing Conzex UiDRAC Agent (tenant-locked credentials)..."
if (Test-Path "$Dir\\UidracAgentSetup.exe") {
  Start-Process -Wait -FilePath "$Dir\\UidracAgentSetup.exe" -ErrorAction SilentlyContinue
}
powershell -ExecutionPolicy Bypass -File "$Dir\\install.ps1" -Config "$Dir\\credentials.json"
Write-Host "Agent console: sign in to the portal → Agents → manage this connector."
`,
      { name: 'Install-UiDRAC-Agent.ps1' },
    );
  } else {
    addFileIfExists(archive, repoPath('apps/edge-agent/linux/install-linux.sh'), 'install-linux.sh');
    addFileIfExists(archive, repoPath('apps/edge-agent/linux/uidrac-agent.service'), 'uidrac-agent.service');
    addFileIfExists(archive, repoPath('apps/edge-agent/macos/agent-bundle.cjs'), 'agent-bundle.cjs');
  }

  await archive.finalize();
  return { filename, stream, sha256 };
}
