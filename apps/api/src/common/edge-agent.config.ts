/** Deployment / public URL helpers for cloud and self-hosted installs. */
export type DeploymentMode = 'cloud' | 'local';

export function deploymentMode(): DeploymentMode {
  if (process.env.DEPLOYMENT_MODE === 'cloud') return 'cloud';
  if (process.env.REQUIRE_EDGE_AGENT === 'true') return 'cloud';
  return 'local';
}

/** Canonical public site URL (no trailing slash). */
export function publicAppUrl(): string {
  const raw =
    process.env.PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_API_URL ??
    process.env.CLOUD_API_URL ??
    'http://localhost:3000';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export function cloudPublicUrl(): string {
  const app = publicAppUrl();
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return app.replace(/:3000$/, ':4000');
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
