/**
 * constants.ts — Application-wide constants shared across all services.
 */

/** Supported iDRAC generations */
export const IDRAC_GENERATIONS = ['6', '7', '8', '9'] as const;

/** User roles for RBAC — ordered from most to least privileged */
export const USER_ROLES = ['owner', 'admin', 'operator', 'viewer'] as const;

/** Credential storage modes */
export const CREDENTIAL_MODES = ['saved', 'session'] as const;

/** Power actions supported across all generations */
export const POWER_ACTIONS = [
  'on',
  'off',
  'graceful-shutdown',
  'reset',
  'nmi',
  'cycle',
] as const;

/** Console launch types */
export const CONSOLE_TYPES = ['html5', 'novnc'] as const;

/** Health status levels */
export const HEALTH_STATUSES = ['healthy', 'warning', 'critical', 'unknown'] as const;

/** Server health aspects */
export const HEALTH_ASPECTS = [
  'overall',
  'cpu',
  'memory',
  'storage',
  'network',
  'fan',
  'power-supply',
  'temperature',
] as const;

/** JWT token lifetimes */
export const TOKEN_LIFETIMES = {
  ACCESS_TOKEN_MINUTES: 15,
  REFRESH_TOKEN_DAYS: 7,
  SESSION_CREDENTIAL_TTL_SECONDS: 1800, // 30 minutes
} as const;

/** Rate limiting defaults */
export const RATE_LIMITS = {
  LOGIN_PER_MINUTE_PER_IP: 5,
  SERVER_ADD_PER_MINUTE_PER_USER: 10,
} as const;

/** Console container defaults */
export const CONSOLE_DEFAULTS = {
  IDLE_TIMEOUT_SECONDS: 1800,
  MAX_PER_TENANT: 10,
  VNC_BASE_PORT: 5900,
  NOVNC_BASE_PORT: 6080,
} as const;

/** HTTP timeouts for iDRAC communication (ms) */
export const IDRAC_TIMEOUTS = {
  CONNECT: 5000,
  READ: 20000,
  RETRIES: 2,
} as const;

/** Redfish API base paths */
export const REDFISH_PATHS = {
  BASE: '/redfish/v1',
  SYSTEMS: '/redfish/v1/Systems/System.Embedded.1',
  CHASSIS: '/redfish/v1/Chassis/System.Embedded.1',
  MANAGERS: '/redfish/v1/Managers/iDRAC.Embedded.1',
  SESSIONS: '/redfish/v1/SessionService/Sessions',
  UPDATE_SERVICE: '/redfish/v1/UpdateService',
  STORAGE: '/redfish/v1/Systems/System.Embedded.1/Storage',
  ETHERNET: '/redfish/v1/Systems/System.Embedded.1/EthernetInterfaces',
} as const;

/** Legacy iDRAC 7 endpoints */
export const LEGACY_PATHS = {
  VERSION: '/data?get=version',
  SYSINFO: '/data?get=sysinfo',
  SEL: '/data?get=sel',
  PHYSICAL_DISKS: '/data?get=pd',
  VIRTUAL_DISKS: '/data?get=vd',
  NIC: '/data?get=nic',
  VIEWER_JNLP: '/viewer.jnlp',
} as const;

/** Legacy iDRAC 6 CGI endpoints */
export const CGI_PATHS = {
  LOGIN: '/cgi-bin/webcgi/login',
  SYSINFO: '/cgi-bin/webcgi/sysinfo',
  SEL: '/cgi-bin/webcgi/sel',
} as const;

/** Audit log action types */
export const AUDIT_ACTIONS = [
  'user.login',
  'user.logout',
  'user.register',
  'user.password_change',
  'user.totp_enable',
  'user.totp_disable',
  'server.add',
  'server.remove',
  'server.update',
  'server.credential_change',
  'server.power_action',
  'server.identify',
  'server.virtual_media_mount',
  'server.virtual_media_eject',
  'console.open',
  'console.close',
  'tenant.update',
  'tenant.user_invite',
  'tenant.user_remove',
] as const;
