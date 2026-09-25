'use client';

import AppPageHeader from '@/components/layout/app-page-header';
import { FleetActionButtons } from '@/components/agent/fleet-action-buttons';
import { AgentStatusBanner } from '@/components/agent/agent-status-banner';
import { useAgentStatus } from '@/lib/agent-client';

/** UiDRAC agent status + optional fleet actions for operator pages. */
export function FleetAgentHeader({
  title,
  className = '',
  showActions = true,
  description,
}: {
  title?: string;
  className?: string;
  showActions?: boolean;
  description?: string;
}) {
  const { status, error } = useAgentStatus();

  return (
    <div className={className}>
      <AppPageHeader
        title={title || 'Server fleet'}
        description={description}
        actions={showActions ? <FleetActionButtons /> : undefined}
      />
      {error && (
        <p className="text-sm text-red-critical bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{error}</p>
      )}
      <AgentStatusBanner status={status} />
    </div>
  );
}
