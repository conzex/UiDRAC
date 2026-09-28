/** Tenant-bound UiDRAC agent download bundle (Settings → Agent download). */
import type { UIDRAC_AGENT_BUNDLE_SCHEMA } from './product';

export type UidracAgentPlatform = 'linux' | 'win' | 'darwin';

export type UidracAgentDownloadBundle = {
  schema: typeof UIDRAC_AGENT_BUNDLE_SCHEMA | 'idrac-edge-agent/v1';
  agentVersion: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  agentId: string;
  uniqueAgentId: string;
  lockedToTenant: true;
  issuedAt: string;
  agentSecret: string;
  enrollmentSignature: string;
  enrollmentToken: string;
  cloudUrl: string;
  wsUrl: string;
  platform: UidracAgentPlatform;
  install: Record<string, string>;
  run: {
    env: Record<string, string>;
    npm: string;
  };
};
