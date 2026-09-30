'use client';

/** @deprecated Use AgentSitePanel — administration lives on the Agents page. */
import { AgentSitePanel } from './agent-site-panel';

type Props = {
  agentId: string;
};

export function AgentManagePanel({ agentId }: Props) {
  return <AgentSitePanel agentId={agentId} />;
}
