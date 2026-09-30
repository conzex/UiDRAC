/** Deployment / public URL helpers for cloud and self-hosted installs. */
import { CLOUD_SAAS_PRODUCT, CONZEX_CLOUD_PRODUCTION_URL } from '@idrac/shared';

export type DeploymentMode = 'cloud' | 'local';

export function deploymentMode(): DeploymentMode {
  if (CLOUD_SAAS_PRODUCT) return 'cloud';
  if (process.env.DEPLOYMENT_MODE === 'cloud') return 'cloud';
  if (process.env.REQUIRE_EDGE_AGENT === 'true') return 'cloud';
  return 'local';
}

/** Normalize env URL to API origin (no /api suffix). */
function normalizeApiOrigin(raw: string): string {
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '').replace(/:3000$/, ':4000');
}

/** Customer-facing cloud base URL (Conzex SaaS always uses production FQDN). */
export function cloudPublicUrl(): string {
  if (process.env.PUBLIC_API_URL) {
    return normalizeApiOrigin(process.env.PUBLIC_API_URL);
  }
  if (process.env.PUBLIC_APP_URL) {
    return normalizeApiOrigin(process.env.PUBLIC_APP_URL);
  }
  if (CLOUD_SAAS_PRODUCT && process.env.NODE_ENV === 'production') return CONZEX_CLOUD_PRODUCTION_URL;
  if (deploymentMode() === 'cloud' && process.env.NODE_ENV === 'production') return CONZEX_CLOUD_PRODUCTION_URL;
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  const raw =
    process.env.PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '').replace(/:3000$/, ':4000');
}

/** Canonical public site URL (no trailing slash). */
export function publicAppUrl(): string {
  if (process.env.PUBLIC_APP_URL) {
    return normalizeApiOrigin(process.env.PUBLIC_APP_URL).replace(/:4000$/, ':3000');
  }
  if (CLOUD_SAAS_PRODUCT && process.env.NODE_ENV === 'production') return CONZEX_CLOUD_PRODUCTION_URL;
  if (deploymentMode() === 'cloud' && process.env.NODE_ENV === 'production') return CONZEX_CLOUD_PRODUCTION_URL;
  const raw =
    process.env.PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_API_URL ??
    process.env.CLOUD_API_URL ??
    'http://localhost:3000';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export function agentWebSocketUrl(): string {
  const base = cloudPublicUrl();
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/api/agent/ws`;
}

export function requireEdgeAgent(): boolean {
  if (process.env.REQUIRE_EDGE_AGENT === 'true') return true;
  if (process.env.REQUIRE_EDGE_AGENT === 'false') return false;
  return deploymentMode() === 'cloud';
}

export function corsOrigins(): string[] {
  const extra = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    publicAppUrl(),
  ];
  return [...new Set([...defaults, ...extra])];
}
