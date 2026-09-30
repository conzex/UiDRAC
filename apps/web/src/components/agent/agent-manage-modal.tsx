'use client';

import AppModal from '@/components/ui/app-modal';
import { AgentSitePanel } from './agent-site-panel';
import { PRIMARY_AGENT_DISPLAY_NAME } from '@idrac/shared';

type Props = {
  agentId: string | null;
  agentName?: string;
  onClose: () => void;
  onChanged: () => void;
};

export function AgentManageModal({ agentId, agentName, onClose }: Props) {
  return (
    <AppModal
      open={Boolean(agentId)}
      onClose={onClose}
      title={agentName ?? PRIMARY_AGENT_DISPLAY_NAME}
      maxWidthClass="max-w-6xl"
      maxHeightClass="max-h-[98vh]"
      bodyScroll
    >
      {agentId && <AgentSitePanel agentId={agentId} />}
    </AppModal>
  );
}
