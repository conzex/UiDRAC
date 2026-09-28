-- Extend tenant_edge_agents for multi-agent registry (Conzex cloud)
ALTER TABLE "tenant_edge_agents" DROP CONSTRAINT IF EXISTS "tenant_edge_agents_tenant_id_key";

ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "name" VARCHAR(120) NOT NULL DEFAULT 'Site agent';
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "hostname" VARCHAR(255);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "os" VARCHAR(32);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "arch" VARCHAR(32);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" TIMESTAMP(3);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "install_state" VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "update_state" VARCHAR(32) NOT NULL DEFAULT 'idle';
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "first_registered_at" TIMESTAMP(3);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);
ALTER TABLE "tenant_edge_agents" ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "tenant_edge_agents_tenant_id_idx" ON "tenant_edge_agents"("tenant_id");
