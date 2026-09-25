/**
 * main.ts — NestJS bootstrap. Starts the API on port 4000.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AgentBridgeService } from './modules/agent/agent-bridge.service';
import { AgentService } from './modules/agent/agent.service';
import { attachAgentWebSocket } from './modules/agent/agent.ws';
import { corsOrigins, publicAppUrl } from './common/edge-agent.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 4000;
  const server = app.getHttpServer();
  attachAgentWebSocket(server, app.get(AgentBridgeService), app.get(AgentService));
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}/api (app: ${publicAppUrl()})`);
}
bootstrap();
