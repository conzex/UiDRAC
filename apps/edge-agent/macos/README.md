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

## Install

1. Download **`uidrac-agent-darwin.json`** from the portal.
2. Either open **`UidracAgent.pkg`**, or from a dev build:

```bash
sudo "/Library/Application Support/Conzex/UiDRAC Agent/install.sh" \
  --config "$HOME/Downloads/uidrac-agent-darwin.json"
```

From repo before PKG:

```bash
cd apps/edge-agent/macos
sudo ./install.sh --config "$HOME/Downloads/uidrac-agent-darwin.json"
```

3. Check logs: `/Library/Logs/Conzex/uidrac-agent.log`
4. Confirm **Connected** under **Agents** in the portal.

**Local console:** http://127.0.0.1:9742 (logo, live logs, iDRAC table)

## Uninstall

```bash
sudo "/Library/Application Support/Conzex/UiDRAC Agent/uninstall.sh"
```

## Portal download

`GET {cloud}/api/agent/download/macos` → `UidracAgent.pkg`
