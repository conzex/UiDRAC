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
  showBulkImport = true,
  addServerOnServersPage = false,
}: {
  title?: string;
  className?: string;
  showActions?: boolean;
  description?: string;
  showBulkImport?: boolean;
  addServerOnServersPage?: boolean;
}) {
  const { status, loading, error } = useAgentStatus();

  return (
    <div className={className}>
      <AppPageHeader
        title={title || 'Server fleet'}
        description={description}
        actions={
          showActions ? (
            <FleetActionButtons showBulkImport={showBulkImport} addServerOnServersPage={addServerOnServersPage} />
          ) : undefined
        }
      />
      <AgentStatusBanner status={status} loading={loading} error={error} />
    </div>
  );
}
