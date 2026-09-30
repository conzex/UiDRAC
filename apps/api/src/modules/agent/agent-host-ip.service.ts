import { Injectable } from '@nestjs/common';
import { resolveAgentHostIp } from '@idrac/shared';
import { PrismaService } from '../../prisma.service';

/** Updates agent host IP without coupling AgentBridge ↔ AgentService. */
@Injectable()
export class AgentHostIpService {
  constructor(private prisma: PrismaService) {}

  async record(publicId: string, hostLanIp: string | null | undefined) {
    const resolved = resolveAgentHostIp(hostLanIp);
    if (!resolved) return;
    await this.prisma.edgeAgent.updateMany({
      where: { publicId },
      data: { lastSeenIp: resolved.slice(0, 45) },
    });
  }
}
