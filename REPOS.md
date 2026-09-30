# Dual repository workflow (Conzex engineering)

Two code lines share history but different distribution. **Do not publish Conzex product clone URLs to customers.**

| | Conzex product | Open-source fork |
|---|----------------|------------------|
| **Role** | Proprietary product + edge agent | MIT, no edge agent |
| **Remote name** | Conzex engineering remote (private) | `sumit-kumawat/uidrac` |
| **OSS URL** | — | https://github.com/sumit-kumawat/uidrac |
| **Local folder** | `universal-idrac-console/` | `uidrac/` |

## What differs

| Area | Conzex product | OSS fork |
|------|----------------|----------|
| Edge agent | Yes | Removed |
| Branding / contact | Conzex | Sumit Kumawat / MIT |
| Customer docs | [docs/KB-INDEX.md](docs/KB-INDEX.md) + in-app Docs | [docs/KB-INDEX.md](../uidrac/docs/KB-INDEX.md) |
| Agent CDN | `cdn.conzex.com/uidrac/agent/` | N/A (Conzex product) |

## After shared feature work

Report changes in three blocks:

**Conzex** — Conzex product tree (engineering)  
**Personal** — https://github.com/sumit-kumawat/uidrac  
**Shared behavior** — what both user bases get

## Remotes (engineers)

```bash
# Conzex product — use your authorized Conzex engineering remote (not customer-facing)
git remote set-url origin <conzex-engineering-remote>

# OSS fork (this repo)
git remote set-url origin https://github.com/sumit-kumawat/uidrac.git
```

The open-source fork mirrors this document at https://github.com/sumit-kumawat/uidrac/blob/main/REPOS.md
