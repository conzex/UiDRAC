/**
 * Naming: user-facing title vs config/docker slug.
 * Use PRODUCT_NAME in UI/docs; use PRODUCT_SLUG and LEGACY_CONSOLE_DOCKER_IMAGE in .env & compose.
 */
export const PRODUCT_NAME = 'Universal iDRAC Console';
export const PRODUCT_SLUG = 'uidrac';
export const PRODUCT_API_NAME = 'Universal iDRAC Console API';
/** Docker image for iDRAC 6/7 legacy console containers. */
export const LEGACY_CONSOLE_DOCKER_IMAGE = 'uidrac:legacy';

/** Conzex cloud SaaS — hide self-service RBAC/admin copy in customer-facing surfaces. */
export const CLOUD_SAAS_PRODUCT = true;

export const OPEN_SOURCE_EDITION = false;

/** Seeded platform super-user (system tenant) — cannot be deleted. */
export const PRIMARY_PLATFORM_ADMIN_EMAIL = 'admin';

/** Conzex cloud production site (HTTPS, no trailing slash). */
export const CONZEX_CLOUD_PRODUCTION_URL = 'https://uidrac.cloud.conzex.com';

/** User-facing name for the tenant LAN connector (cloud product). */
export const UIDRAC_AGENT_NAME = 'UiDRAC Agent';

/** Canonical display name for the tenant default (primary) edge agent. */
export const PRIMARY_AGENT_DISPLAY_NAME = 'Master-Agent (Default)';

/** Agent console subtitle (portal); copyright is shown in the footer separately. */
export const UIDRAC_AGENT_CONSOLE_TAGLINE = `${PRODUCT_NAME} — LAN bridge`;

export const CONZEX_COPYRIGHT_LINE = 'Copyright © 2026 Conzex Global Private Limited';

/** Download bundle filename prefix (e.g. uidrac-agent-linux.json). */
export const UIDRAC_AGENT_BUNDLE_PREFIX = 'uidrac-agent';

/** Preferred env var for agent JSON bundle path (IDRAC_AGENT_CONFIG still supported). */
export const UIDRAC_AGENT_CONFIG_ENV = 'UIDRAC_AGENT_CONFIG';

/** JSON bundle schema (current + legacy alias accepted by agents). */
export const UIDRAC_AGENT_BUNDLE_SCHEMA = 'uidrac-edge-agent/v1';
export const UIDRAC_AGENT_BUNDLE_SCHEMA_LEGACY = 'idrac-edge-agent/v1';

/** Conzex Global Private Limited — product vendor. */
export const CONZEX_WEB_URL = 'https://www.conzex.com';
export const CONZEX_CONTACT_EMAIL = 'info@conzex.com';

/** Open-source fork maintainer (MIT tree). */
export const OSS_AUTHOR_NAME = 'Sumit Kumawat';
export const OSS_AUTHOR_PROFILE_URL = 'https://www.sumitkumawat.com';
export const OSS_AUTHOR_EMAIL = 'hello@sumitkumawat.com';
