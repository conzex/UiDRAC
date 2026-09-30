/** agent.service.ts — Per-tenant edge agents: credentials, registry, downloads. */
import { ForbiddenException, Injectable, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import {
  decryptSecret,
  encryptSecret,
  enrollmentSignature,
  randomAgentSecret,
} from '../../common/crypto.util';
import {
  agentWebSocketUrl,
  cloudPublicUrl,
  cloudPublicUrlFromRequest,
  requireEdgeAgent,
  shouldEmbedLocalAgentEndpoints,
} from '../../common/edge-agent.config';
import {
  APP_VERSION,
  type AgentConnectionState,
  UIDRAC_AGENT_BUNDLE_PREFIX,
  UIDRAC_AGENT_BUNDLE_SCHEMA,
} from '@idrac/shared';
import { AgentBridgeService } from './agent-bridge.service';
import { AgentConsoleStore } from './agent-console.store';
import { buildAgentInstallerZip } from './agent-installer.service';
import { aggregateTenantConnectionState, computeAgentConnectionState } from './agent-connection.util';

export type AgentDto = {
  id: string;
  publicId: string;
  name: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  lockedToTenant: true;
  isPrimary: boolean;
  status: AgentConnectionState;
  connected: boolean;
  os: string | null;
  arch: string | null;
  hostname: string | null;
  agentVersion: string | null;
  releaseAgentVersion: string;
  installState: string;
  updateState: string;
  lastConnectedAt: string | null;
  lastHeartbeatAt: string | null;
  firstRegisteredAt: string | null;
  lastSeenIp: string | null;
  credentialsRotatedAt: string | null;
  revokedAt: string | null;
  disabledAt: string | null;
  wsUrl: string;
  cloudUrl: string;
};

export type AgentStatusDto = {
  publicId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  lockedToTenant: true;
  credentialsRotatedAt: string | null;
  connected: boolean;
  status: AgentConnectionState;
  requireEdgeAgent: boolean;
  lastConnectedAt: string | null;
  lastSeenIp: string | null;
  agentVersion: string | null;
  releaseAgentVersion: string;
  wsUrl: string;
  cloudUrl: string;
  agentCount: number;
};

@Injectable()
export class AgentService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private bridge: AgentBridgeService,
    private consoleStore: AgentConsoleStore,
  ) {}

  async onModuleInit() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { edgeAgents: { none: {} } },
        select: { id: true },
      });
      for (const t of tenants) {
        await this.ensurePrimaryForTenant(t.id);
      }
      if (tenants.length > 0) {
        console.log(`[agent] Provisioned edge agents for ${tenants.length} tenant(s)`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[agent] Startup provisioning skipped:', msg);
    }
  }

  async ensurePrimaryForTenant(tenantId: string) {
    const existing = await this.prisma.edgeAgent.findFirst({
      where: { tenantId, isPrimary: true },
    });
    if (existing) return existing;
    return this.createAgentRecord(tenantId, { name: 'Master-Agent (Default)', isPrimary: true });
  }

  async createAgent(
    tenantId: string,
    opts?: { name?: string; isPrimary?: boolean },
  ) {
    return this.createAgentRecord(tenantId, {
      name: opts?.name ?? `Agent ${crypto.randomBytes(3).toString('hex')}`,
      isPrimary: opts?.isPrimary ?? false,
    });
  }

  private async createAgentRecord(
    tenantId: string,
    opts: { name: string; isPrimary: boolean },
  ) {
    const publicId = crypto.randomUUID();
    const secret = randomAgentSecret();
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const { encrypted, iv, tag } = encryptSecret(secret);
    const enrollmentSig = enrollmentSignature(tenantId, publicId);
    return this.prisma.edgeAgent.create({
      data: {
        tenantId,
        name: opts.name,
        isPrimary: opts.isPrimary,
        publicId,
        secretHash,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        enrollmentSig,
      },
    });
  }

  async assertAgentOwned(tenantId: string, agentId: string) {
    const row = await this.prisma.edgeAgent.findFirst({
      where: { id: agentId, tenantId },
    });
    if (!row) throw new NotFoundException('Agent not found');
    return row;
  }

  private ensureAgentActiveForDownload(row: { revokedAt: Date | null; name: string }) {
    if (row.revokedAt) {
      throw new BadRequestException(
        `Agent "${row.name}" is revoked. Use Reactivate on the agent page, download a new package, and reinstall.`,
      );
    }
  }

  async assertPublicIdOwned(tenantId: string, publicId: string) {
    const row = await this.prisma.edgeAgent.findFirst({
      where: { publicId, tenantId },
    });
    if (!row) throw new NotFoundException('Agent not found');
    return row;
  }

  async verifyAgentCredentials(publicId: string, secret: string) {
    const record = await this.prisma.edgeAgent.findUnique({ where: { publicId } });
    if (!record) return null;
    if (record.revokedAt || record.disabledAt) return null;
    const ok = await argon2.verify(record.secretHash, secret);
    if (!ok) return null;
    return record;
  }

  private async toAgentDto(record: Awaited<ReturnType<typeof this.assertAgentOwned>>): Promise<AgentDto> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: record.tenantId },
      select: { id: true, name: true, slug: true },
    });
    const socketOpen = this.bridge.isAgentSocketOpen(record.publicId);
    const status = computeAgentConnectionState(record, { socketOpen });
    return {
      id: record.id,
      publicId: record.publicId,
      name: record.name,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      lockedToTenant: true,
      isPrimary: record.isPrimary,
      status,
      connected: status === 'connected',
      os: record.os,
      arch: record.arch,
      hostname: record.hostname,
      agentVersion: record.agentVersion,
      releaseAgentVersion: APP_VERSION,
      installState: record.installState,
      updateState: record.updateState,
      lastConnectedAt: record.lastConnectedAt?.toISOString() ?? null,
      lastHeartbeatAt: record.lastHeartbeatAt?.toISOString() ?? null,
      firstRegisteredAt: record.firstRegisteredAt?.toISOString() ?? null,
      lastSeenIp: record.lastSeenIp,
      credentialsRotatedAt: record.rotatedAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
      disabledAt: record.disabledAt?.toISOString() ?? null,
      wsUrl: agentWebSocketUrl(),
      cloudUrl: cloudPublicUrl(),
    };
  }

  async listAgents(tenantId: string): Promise<AgentDto[]> {
    await this.ensurePrimaryForTenant(tenantId);
    const rows = await this.prisma.edgeAgent.findMany({
      where: { tenantId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return Promise.all(rows.map((r) => this.toAgentDto(r)));
  }

  async getAgent(tenantId: string, agentId: string): Promise<AgentDto> {
    const row = await this.assertAgentOwned(tenantId, agentId);
    return this.toAgentDto(row);
  }

  async getStatus(tenantId: string): Promise<AgentStatusDto> {
    const agents = await this.listAgents(tenantId);
    const primary = agents.find((a) => a.isPrimary) ?? agents[0];
    const states = agents.map((a) => a.status);
    const status = aggregateTenantConnectionState(states);
    return {
      publicId: primary?.publicId ?? '',
      tenantId: primary?.tenantId ?? tenantId,
      tenantName: primary?.tenantName ?? '',
      tenantSlug: primary?.tenantSlug ?? '',
      lockedToTenant: true,
      credentialsRotatedAt: primary?.credentialsRotatedAt ?? null,
      connected: status === 'connected',
      status,
      requireEdgeAgent: requireEdgeAgent(),
      lastConnectedAt: primary?.lastConnectedAt ?? null,
      lastSeenIp: primary?.lastSeenIp ?? null,
      agentVersion: primary?.agentVersion ?? null,
      releaseAgentVersion: APP_VERSION,
      wsUrl: agentWebSocketUrl(),
      cloudUrl: cloudPublicUrl(),
      agentCount: agents.length,
    };
  }

  async resolveAgentForDownload(tenantId: string, agentId?: string) {
    const row = agentId ? await this.assertAgentOwned(tenantId, agentId) : await this.ensurePrimaryForTenant(tenantId);
    this.ensureAgentActiveForDownload(row);
    return row;
  }

  async buildDownloadBundle(
    tenantId: string,
    platform: 'linux' | 'win' | 'darwin',
    agentRow?: Awaited<ReturnType<typeof this.resolveAgentForDownload>>,
    requestOrigin?: string,
  ) {
    const record = agentRow ?? (await this.ensurePrimaryForTenant(tenantId));
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    const secret = decryptSecret(record.secretEncrypted, record.secretIv, record.secretTag);
    const issuedAt = new Date().toISOString();
    const enrollmentToken = this.jwt.sign(
      { typ: 'edge-enrollment', tenantId, agentId: record.publicId },
      {
        secret: process.env.AGENT_SIGNING_SECRET ?? process.env.JWT_SECRET ?? 'dev-agent-signing',
        expiresIn: '3650d',
      },
    );
    const cloud =
      cloudPublicUrlFromRequest(requestOrigin) ??
      cloudPublicUrl();
    const ws = agentWebSocketUrl(cloud);
    const localUrl = process.env.AGENT_LOCAL_URL ?? 'http://127.0.0.1:4000';
    const localWsUrl = process.env.AGENT_LOCAL_WS_URL ?? 'ws://127.0.0.1:4000/api/agent/ws';
    const embedLocal = shouldEmbedLocalAgentEndpoints();
    const endpoints: { label: string; cloudUrl: string; wsUrl: string }[] = [];
    if (embedLocal && !/localhost|127\.0\.0\.1/.test(cloud)) {
      endpoints.push({ label: 'local', cloudUrl: localUrl, wsUrl: localWsUrl });
    }
    endpoints.push({ label: 'cloud', cloudUrl: cloud, wsUrl: ws });
    const bundlePrefix = UIDRAC_AGENT_BUNDLE_PREFIX;
    const bundle: Record<string, unknown> = {
      schema: UIDRAC_AGENT_BUNDLE_SCHEMA,
      agentVersion: APP_VERSION,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      lockedToTenant: true as const,
      issuedAt,
      agentId: record.publicId,
      uniqueAgentId: record.publicId,
      agentSecret: secret,
      enrollmentSignature: record.enrollmentSig,
      enrollmentToken,
      cloudUrl: cloud,
      wsUrl: ws,
      enableLocalFallback: embedLocal,
      endpoints,
      platform,
      install: {
        linux: `curl -fsSL "${cloud}/api/agent/install.sh" | bash -s -- --config credentials.json`,
        win: `Download installer from ${cloud}/agents then run Install-UiDRAC-Agent.ps1 with credentials.json`,
        darwin: `sudo installer -pkg UidracAgent.pkg -target / && sudo ./install.sh --config credentials.json`,
      },
      run: {
        env: {
          UIDRAC_AGENT_ID: record.publicId,
          UIDRAC_AGENT_SECRET: secret,
          UIDRAC_CLOUD_URL: cloud,
          UIDRAC_AGENT_WS_URL: ws,
          UIDRAC_LOCAL_URL: embedLocal ? localUrl : undefined,
          UIDRAC_LOCAL_WS_URL: embedLocal ? localWsUrl : undefined,
        },
        npm: 'npx @idrac/edge-agent',
      },
    };
    if (embedLocal) {
      bundle.localUrl = localUrl;
      bundle.localWsUrl = localWsUrl;
    }
    return { filename: `${bundlePrefix}-${platform}.json`, bundle, record };
  }

  async buildInstallerPackage(
    tenantId: string,
    platform: 'linux' | 'win' | 'darwin',
    agentId?: string,
    requestOrigin?: string,
  ) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { slug: true },
    });
    const record = await this.resolveAgentForDownload(tenantId, agentId);
    const { bundle } = await this.buildDownloadBundle(tenantId, platform, record, requestOrigin);
    const credentialsJson = JSON.stringify(bundle, null, 2);
    return buildAgentInstallerZip(platform, credentialsJson, tenant.slug, record.publicId);
  }

  async getAgentConsoleView(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    const agent = await this.toAgentDto(row);
    const remote = await this.consoleStore.getConsoleData(row.publicId);
    const startedAt =
      agent.firstRegisteredAt ?? agent.lastConnectedAt ?? new Date().toISOString();
    const fallbackSnapshot = {
      version: agent.agentVersion ?? APP_VERSION,
      cloudUrl: agent.cloudUrl,
      wsUrl: agent.wsUrl,
      agentId: agent.publicId,
      tenantId: agent.tenantId,
      tenantName: agent.tenantName,
      cloudConnected: agent.connected,
      authenticated: agent.connected,
      lastError: null as string | null,
      startedAt,
    };
    return {
      agent,
      snapshot: remote.snapshot ?? fallbackSnapshot,
      logs: remote.logs,
      activity: remote.activity,
    };
  }

  async getConsoleView(tenantId: string) {
    const status = await this.getStatus(tenantId);
    const agents = await this.listAgents(tenantId);
    const primary = agents.find((a) => a.isPrimary) ?? agents[0];
    if (!primary) {
      return { status, agents, agent: null, snapshot: null, logs: [], activity: [] };
    }
    const view = await this.getAgentConsoleView(tenantId, primary.id);
    return { status, agents, ...view };
  }

  async markConnected(
    publicId: string,
    ip: string,
    meta?: { version?: string; hostname?: string; os?: string; arch?: string },
  ) {
    const now = new Date();
    const existing = await this.prisma.edgeAgent.findUnique({ where: { publicId } });
    if (!existing) return;
    await this.prisma.edgeAgent.update({
      where: { publicId },
      data: {
        lastConnectedAt: now,
        lastHeartbeatAt: now,
        lastSeenIp: ip.slice(0, 45),
        agentVersion: meta?.version?.slice(0, 32) ?? existing.agentVersion,
        hostname: meta?.hostname?.slice(0, 255) ?? existing.hostname,
        os: meta?.os?.slice(0, 32) ?? existing.os,
        arch: meta?.arch?.slice(0, 32) ?? existing.arch,
        firstRegisteredAt: existing.firstRegisteredAt ?? now,
        installState: 'registered',
      },
    });
  }

  async markHeartbeat(publicId: string) {
    await this.prisma.edgeAgent.update({
      where: { publicId },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async renameAgent(tenantId: string, agentId: string, name: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (row.revokedAt) throw new ForbiddenException('Revoked agents cannot be renamed');
    if (row.isPrimary) throw new ForbiddenException('The default master agent cannot be renamed');
    await this.prisma.edgeAgent.update({ where: { id: agentId }, data: { name: name.slice(0, 120) } });
    return this.getAgent(tenantId, agentId);
  }

  async disableAgent(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (row.revokedAt) throw new BadRequestException('Revoked agents cannot be disabled. Delete or reactivate instead.');
    await this.prisma.edgeAgent.update({
      where: { id: agentId },
      data: { disabledAt: new Date() },
    });
    this.bridge.disconnectAgent(row.publicId);
    return this.getAgent(tenantId, agentId);
  }

  async enableAgent(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (row.revokedAt) {
      throw new BadRequestException('Revoked agents must be reactivated with a new installer package.');
    }
    await this.prisma.edgeAgent.update({
      where: { id: agentId },
      data: { disabledAt: null },
    });
    return this.getAgent(tenantId, agentId);
  }

  async revokeAgent(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    await this.prisma.edgeAgent.update({
      where: { id: agentId },
      data: { revokedAt: new Date(), disabledAt: new Date(), installState: 'revoked' },
    });
    this.bridge.disconnectAgent(row.publicId);
    return this.getAgent(tenantId, agentId);
  }

  /** Clear revoked/disabled state and issue new credentials (same Agent ID). */
  async reactivateAgent(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (!row.revokedAt && !row.disabledAt) {
      throw new BadRequestException('Agent is already active.');
    }
    const secret = randomAgentSecret();
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const { encrypted, iv, tag } = encryptSecret(secret);
    const enrollmentSig = enrollmentSignature(tenantId, row.publicId);
    await this.prisma.edgeAgent.update({
      where: { id: agentId },
      data: {
        revokedAt: null,
        disabledAt: null,
        secretHash,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        enrollmentSig,
        rotatedAt: new Date(),
        installState: 'pending',
        updateState: 'idle',
      },
    });
    this.bridge.disconnectAgent(row.publicId);
    return this.getAgent(tenantId, agentId);
  }

  async deleteAgentRecord(tenantId: string, agentId: string) {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (!row.revokedAt) {
      throw new ForbiddenException('Revoke the agent first, then you can remove it from your organization list.');
    }
    if (row.isPrimary) {
      throw new ForbiddenException('The default master agent cannot be deleted. You may revoke or reactivate it.');
    }
    await this.prisma.edgeAgent.delete({ where: { id: agentId } });
    return { deleted: true, publicId: row.publicId };
  }

  async rotateCredentials(tenantId: string, agentId: string, platform: 'linux' | 'win' | 'darwin' = 'linux') {
    const row = await this.assertAgentOwned(tenantId, agentId);
    if (row.revokedAt) throw new ForbiddenException('Cannot rotate a revoked agent');
    const secret = randomAgentSecret();
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const { encrypted, iv, tag } = encryptSecret(secret);
    const enrollmentSig = enrollmentSignature(tenantId, row.publicId);
    await this.prisma.edgeAgent.update({
      where: { id: agentId },
      data: {
        secretHash,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        enrollmentSig,
        rotatedAt: new Date(),
        installState: 'pending',
      },
    });
    this.bridge.disconnectAgent(row.publicId);
    return this.buildDownloadBundle(tenantId, platform, row);
  }

  async registerNewAgent(tenantId: string, name?: string) {
    return this.createAgent(tenantId, { name: name ?? 'New site agent', isPrimary: false });
  }

  getPublicConfig() {
    return { requireEdgeAgent: requireEdgeAgent(), wsUrl: agentWebSocketUrl(), cloudUrl: cloudPublicUrl() };
  }
}
