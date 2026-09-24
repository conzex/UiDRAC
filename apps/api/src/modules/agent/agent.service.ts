/** agent.service.ts — Per-tenant edge agent credentials and download bundles. */
import { Injectable, OnModuleInit } from '@nestjs/common';
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
import { agentWebSocketUrl, cloudPublicUrl, requireEdgeAgent } from '../../common/edge-agent.config';
import { AgentBridgeService } from './agent-bridge.service';

export type AgentStatusDto = {
  publicId: string;
  connected: boolean;
  requireEdgeAgent: boolean;
  lastConnectedAt: string | null;
  lastSeenIp: string | null;
  agentVersion: string | null;
  wsUrl: string;
  cloudUrl: string;
};

@Injectable()
export class AgentService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private bridge: AgentBridgeService,
  ) {}

  async onModuleInit() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { edgeAgent: null },
        select: { id: true },
      });
      for (const t of tenants) {
        await this.ensureForTenant(t.id);
      }
      if (tenants.length > 0) {
        console.log(`[agent] Provisioned edge agents for ${tenants.length} tenant(s)`);
      }
    } catch (err: any) {
      console.error('[agent] Startup provisioning skipped:', err?.message || err);
    }
  }

  async ensureForTenant(tenantId: string) {
    const existing = await this.prisma.tenantEdgeAgent.findUnique({ where: { tenantId } });
    if (existing) return existing;
    return this.createAgentRecord(tenantId);
  }

  private async createAgentRecord(tenantId: string) {
    const publicId = crypto.randomUUID();
    const secret = randomAgentSecret();
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const { encrypted, iv, tag } = encryptSecret(secret);
    const enrollmentSig = enrollmentSignature(tenantId, publicId);
    return this.prisma.tenantEdgeAgent.create({
      data: {
        tenantId,
        publicId,
        secretHash,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        enrollmentSig,
      },
    });
  }

  async verifyAgentCredentials(publicId: string, secret: string) {
    const record = await this.prisma.tenantEdgeAgent.findUnique({ where: { publicId } });
    if (!record) return null;
    const ok = await argon2.verify(record.secretHash, secret);
    if (!ok) return null;
    return record;
  }

  async getStatus(tenantId: string): Promise<AgentStatusDto> {
    const record = await this.ensureForTenant(tenantId);
    const connected = await this.bridge.isConnected(tenantId);
    return {
      publicId: record.publicId,
      connected,
      requireEdgeAgent: requireEdgeAgent(),
      lastConnectedAt: record.lastConnectedAt?.toISOString() ?? null,
      lastSeenIp: record.lastSeenIp,
      agentVersion: record.agentVersion,
      wsUrl: agentWebSocketUrl(),
      cloudUrl: cloudPublicUrl(),
    };
  }

  async buildDownloadBundle(tenantId: string, platform: 'linux' | 'win' | 'darwin') {
    const record = await this.ensureForTenant(tenantId);
    const secret = decryptSecret(record.secretEncrypted, record.secretIv, record.secretTag);
    const enrollmentToken = this.jwt.sign(
      { typ: 'edge-enrollment', tenantId, agentId: record.publicId },
      { secret: process.env.AGENT_SIGNING_SECRET ?? process.env.JWT_SECRET ?? 'dev-agent-signing', expiresIn: '3650d' },
    );
    const bundle = {
      schema: 'idrac-edge-agent/v1',
      tenantId,
      agentId: record.publicId,
      uniqueAgentId: record.publicId,
      agentSecret: secret,
      enrollmentSignature: record.enrollmentSig,
      enrollmentToken,
      cloudUrl: cloudPublicUrl(),
      wsUrl: agentWebSocketUrl(),
      platform,
      install: {
        linux: 'curl -fsSL "$CLOUD_URL/api/agent/install.sh" | bash -s -- --config idrac-agent.json',
        win: 'powershell -ExecutionPolicy Bypass -File install.ps1 -Config idrac-agent.json',
        darwin: 'curl -fsSL "$CLOUD_URL/api/agent/install.sh" | bash -s -- --config idrac-agent.json',
      },
      run: {
        env: {
          IDRAC_AGENT_ID: record.publicId,
          IDRAC_AGENT_SECRET: secret,
          IDRAC_CLOUD_URL: cloudPublicUrl(),
          IDRAC_AGENT_WS_URL: agentWebSocketUrl(),
        },
        npm: 'npx @idrac/edge-agent',
      },
    };
    return { filename: `idrac-agent-${platform}.json`, bundle };
  }

  async markConnected(publicId: string, ip: string, version?: string) {
    await this.prisma.tenantEdgeAgent.update({
      where: { publicId },
      data: {
        lastConnectedAt: new Date(),
        lastSeenIp: ip.slice(0, 45),
        agentVersion: version?.slice(0, 32),
      },
    });
  }

  async rotateCredentials(tenantId: string) {
    const secret = randomAgentSecret();
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const { encrypted, iv, tag } = encryptSecret(secret);
    const record = await this.prisma.tenantEdgeAgent.findUnique({ where: { tenantId } });
    if (!record) {
      await this.createAgentRecord(tenantId);
      return this.buildDownloadBundle(tenantId, 'linux');
    }
    const enrollmentSig = enrollmentSignature(tenantId, record.publicId);
    await this.prisma.tenantEdgeAgent.update({
      where: { tenantId },
      data: {
        secretHash,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        enrollmentSig,
        rotatedAt: new Date(),
      },
    });
    return this.buildDownloadBundle(tenantId, 'linux');
  }

  getPublicConfig() {
    return { requireEdgeAgent: requireEdgeAgent(), wsUrl: agentWebSocketUrl(), cloudUrl: cloudPublicUrl() };
  }
}
