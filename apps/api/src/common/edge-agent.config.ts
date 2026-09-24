/** Cloud vs self-hosted edge agent behavior. */
export function requireEdgeAgent(): boolean {
  return process.env.REQUIRE_EDGE_AGENT === 'true';
}

export function cloudPublicUrl(): string {
  return (process.env.PUBLIC_API_URL ?? process.env.CLOUD_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}

export function agentWebSocketUrl(): string {
  const base = cloudPublicUrl();
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/api/agent/ws`;
}
