# Conzex UiDRAC Agent — macOS

**Copyright (c) 2026 Conzex Global Private Limited. All rights reserved.**

## Build (macOS + Xcode Command Line Tools)

```bash
./scripts/build-edge-agent-macos.sh
```

Output:

- `macos/uidrac-agent` — standalone binary (Apple Silicon or Intel, matches build host)
- `macos/out/UidracAgent.pkg` — installer with Conzex EULA

Requires: Node 20+, pnpm, `pkgbuild` / `productbuild` (Xcode CLT).

## Install (portal ZIP — recommended)

1. Download the **macOS ZIP** from **Agents** and unzip.
2. One command:

```bash
cd ~/Downloads/UidracAgent-macos-YOURFOLDER
chmod +x install-macos-agent.sh
sudo ./install-macos-agent.sh
```

Double-click **`Install-UiDRAC-Agent.command`** runs the same steps (macOS will prompt for password).

## Install (dev / repo)

Build PKG + bundle:

```bash
./scripts/build-edge-agent-macos.sh
```

Then from `apps/edge-agent/macos` with a credentials JSON:

```bash
sudo ./install-macos-agent.sh --config /path/to/credentials.json
```

3. Check logs: `/Library/Logs/Conzex/uidrac-agent.log`
4. Confirm **Connected** under **Agents** in the portal.

**Always on:** `install.sh` registers a **system LaunchDaemon** (`com.conzex.uidrac.agent`) with `RunAtLoad` and `KeepAlive`. The agent keeps running after you close Terminal and starts again after reboot. It does **not** depend on an open shell.

**Requires Node.js 20+** on disk (`/opt/homebrew/bin/node` or `/usr/local/bin/node`). The installer records the absolute Node path in `run-launchd.sh`. If you upgrade Node, re-run `install.sh` with your `credentials.json`.

```bash
sudo launchctl print system/com.conzex.uidrac.agent | grep 'state ='
```

**Console:** Portal → Agents → UiDRAC Agent console

## Uninstall

```bash
sudo "/Library/Application Support/Conzex/UiDRAC Agent/uninstall.sh"
```

## Portal download

`GET {cloud}/api/agent/download/macos` → `UidracAgent.pkg`
