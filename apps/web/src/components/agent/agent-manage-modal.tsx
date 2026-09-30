'use client';

import AppModal from '@/components/ui/app-modal';
import { AgentManagePanel } from './agent-manage-panel';

type Props = {
  agentId: string | null;
  agentName?: string;
  onClose: () => void;
  onChanged: () => void;
};

export function AgentManageModal({ agentId, agentName, onClose, onChanged }: Props) {
  return (
    <AppModal
      open={Boolean(agentId)}
      onClose={onClose}
      title={agentName ? `Manage · ${agentName}` : 'Manage agent'}
      subtitle="Status, credentials, and installation"
      maxWidthClass="max-w-6xl"
      maxHeightClass="max-h-[98vh]"
      bodyScroll
    >
      {agentId && (
        <AgentManagePanel
          agentId={agentId}
          onChanged={onChanged}
          onDeleted={onClose}
        />
      )}
    </AppModal>
  );
}
