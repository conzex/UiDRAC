/** Public (ticket-auth) HTTP proxy for iDRAC HTML5 console via edge agent. */
import { All, Controller, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators';
import { ServerConsoleTunnelService } from './server-console-tunnel.service';

@Controller('servers/:serverId/console/tunnel')
@Public()
export class ServersConsoleTunnelController {
  constructor(private tunnel: ServerConsoleTunnelService) {}

  @All('*')
  async proxy(@Param('serverId') serverId: string, @Req() req: Request, @Res() res: Response) {
    await this.tunnel.handleHttp(serverId, req, res);
  }
}
