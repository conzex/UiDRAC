/** Agent CDN + terminal commands — same text as Agents → Manual install (for Docs). */
import { AGENT_CDN_BASE_URL } from '@idrac/shared';
import { getAgentInstallGuide, platformLabel } from '@/lib/client-platform';
import type { AgentPlatform } from '@/lib/agents-client';

const PLATFORMS: AgentPlatform[] = ['darwin', 'win', 'linux'];

export function agentCdnHostingChecklist(): string {
  return (
    '**Host these five files** on your CDN (e.g. `https://cdn.conzex.com/uidrac/agent/`):\n\n' +
    '| File | Used for |\n|------|----------|\n' +
    '| `UidracAgent.pkg` | macOS download |\n' +
    '| `UidracAgentSetup.exe` | Windows download |\n' +
    '| `UidracAgent-linux.sh` | Linux download |\n' +
    '| `agent-bundle.cjs` | Linux install (auto-fetched) |\n' +
    '| `uidrac-agent.service` | Linux install (auto-fetched) |\n\n' +
    '**Never** put `credentials.json` on the CDN. Customers download it only from **Agents** in the portal.\n\n' +
    'Build and stage locally: `pnpm agent:cdn-stage` → upload `cdn-agent/`. Verify: `pnpm agent:cdn-verify`.'
  );
}

export function agentInstallCommandsDocs(cdnBase = AGENT_CDN_BASE_URL): string {
  const intro =
    'Download **credentials.json** from [**Agents**](/agents) first, then run the commands for your OS (same as the **Manual / Terminal** block on that page):\n\n';
  const blocks = PLATFORMS.map((p) => {
    const g = getAgentInstallGuide(p, cdnBase);
    const lang = p === 'win' ? 'powershell' : 'bash';
    return `**${platformLabel(p)} — ${g.headline}**\n\n\`\`\`${lang}\n${g.commands.join('\n')}\n\`\`\``;
  });
  return intro + blocks.join('\n\n');
}
