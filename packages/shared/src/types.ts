/**
 * types.ts — Core TypeScript types used across all services.
 * These types mirror the Prisma models and define the iDRAC adapter interface contract.
 */

import type {
  IDRAC_GENERATIONS,
  USER_ROLES,
  CREDENTIAL_MODES,
  POWER_ACTIONS,
  CONSOLE_TYPES,
  HEALTH_STATUSES,
  HEALTH_ASPECTS,
  AUDIT_ACTIONS,
} from './constants';

// ── Utility types ──

export type IdracGeneration = (typeof IDRAC_GENERATIONS)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type CredentialMode = (typeof CREDENTIAL_MODES)[number];
export type PowerAction = (typeof POWER_ACTIONS)[number];
export type ConsoleType = (typeof CONSOLE_TYPES)[number];
export type HealthStatus = (typeof HEALTH_STATUSES)[number];
export type HealthAspect = (typeof HEALTH_ASPECTS)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ── Domain models ──

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface Server {
  id: string;
  tenantId: string;
  name: string;
  ip: string;
  generation: IdracGeneration;
  model: string | null;
  serviceTag: string | null;
  firmwareVersion: string | null;
  credentialsMode: CredentialMode;
  tags: string[];
  createdAt: Date;
  lastSeenAt: Date | null;
  health: HealthStatus;
}

export interface ConsoleSession {
  id: string;
  serverId: string;
  userId: string;
  containerId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  recordingPath: string | null;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  serverId: string | null;
  action: AuditAction;
  payload: Record<string, unknown>;
  ip: string;
  createdAt: Date;
}

// ── iDRAC Adapter types ──

export interface SystemInfo {
  model: string;
  manufacturer: string;
  serviceTag: string;
  expressServiceCode: string | null;
  hostName: string | null;
  osName: string | null;
  osVersion: string | null;
  biosVersion: string;
  cpuModel: string;
  cpuCount: number;
  totalMemoryGB: number;
  powerState: PowerState;
}

export type PowerState = 'on' | 'off' | 'powering-on' | 'powering-off' | 'unknown';

export interface HealthInfo {
  overall: HealthStatus;
  aspects: HealthAspectInfo[];
}

export interface HealthAspectInfo {
  aspect: HealthAspect;
  status: HealthStatus;
  message?: string;
}

export interface LogEntry {
  id: string;
  severity: 'informational' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  source?: string;
}

export interface StorageController {
  id: string;
  name: string;
  model: string;
  firmwareVersion: string;
  status: HealthStatus;
}

export interface PhysicalDisk {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  capacityGB: number;
  mediaType: 'HDD' | 'SSD' | 'NVMe' | 'Unknown';
  status: HealthStatus;
  controllerId: string;
}

export interface VirtualDisk {
  id: string;
  name: string;
  raidLevel: string;
  capacityGB: number;
  status: HealthStatus;
  controllerId: string;
}

export interface StorageInfo {
  controllers: StorageController[];
  physicalDisks: PhysicalDisk[];
  virtualDisks: VirtualDisk[];
}

export interface NetworkInterface {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string | null;
  speedMbps: number | null;
  status: 'up' | 'down' | 'unknown';
  linkStatus: 'up' | 'down' | 'unknown';
}

export interface NetworkInfo {
  interfaces: NetworkInterface[];
}

export interface IdracUser {
  id: number;
  name: string;
  enabled: boolean;
  privilege: string;
}

export interface FirmwareInfo {
  idracVersion: string;
  biosVersion: string;
  lifecycleControllerVersion: string | null;
  components: FirmwareComponent[];
}

export interface FirmwareComponent {
  name: string;
  version: string;
  updateable: boolean;
}

export interface SensorReading {
  name: string;
  value: number;
  unit: string;
  status: HealthStatus;
  thresholdWarning?: number;
  thresholdCritical?: number;
}

export interface SelEntry {
  id: string;
  severity: 'informational' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  component?: string;
}

export interface ConsoleLaunch {
  type: ConsoleType;
  url: string;
  generation: IdracGeneration;
}

// ── iDRAC Adapter Interface ──

export interface IdracAdapter {
  readonly generation: IdracGeneration;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSystemInfo(): Promise<SystemInfo>;
  getHealth(): Promise<HealthInfo>;
  getLogs(opts?: { limit?: number; since?: Date }): Promise<LogEntry[]>;
  getStorage(): Promise<StorageInfo>;
  getNetwork(): Promise<NetworkInfo>;
  getPower(): Promise<PowerState>;
  getUsers(): Promise<IdracUser[]>;
  getFirmware(): Promise<FirmwareInfo>;
  powerAction(action: PowerAction): Promise<void>;
  setIdentify(on: boolean): Promise<void>;
  getConsoleUrl(): Promise<ConsoleLaunch>;
  mountVirtualMedia(iso: string): Promise<void>;
  ejectVirtualMedia(): Promise<void>;
  getSensors(): Promise<SensorReading[]>;
  getSel(): Promise<SelEntry[]>;
}

// ── API Request/Response types ──

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'email' | 'role' | 'tenantId'>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  tenantName: string;
}

export interface AddServerRequest {
  name: string;
  ip: string;
  username: string;
  password: string;
  credentialsMode: CredentialMode;
  tags?: string[];
}

export interface ServerProbeResult {
  generation: IdracGeneration;
  model: string | null;
  serviceTag: string | null;
  firmwareVersion: string | null;
  health: HealthStatus;
}

export interface SpawnConsoleRequest {
  serverId: string;
  idracIp: string;
  username: string;
  password: string;
  generation: IdracGeneration;
}

export interface SpawnConsoleResponse {
  containerId: string;
  novncUrl: string;
  sessionId: string;
}

// ── WebSocket events ──

export interface WsHealthUpdate {
  event: 'health:update';
  serverId: string;
  health: HealthInfo;
  timestamp: string;
}

export interface WsLogUpdate {
  event: 'logs:update';
  serverId: string;
  logs: LogEntry[];
  timestamp: string;
}

export interface WsConsoleStatus {
  event: 'console:status';
  serverId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  containerId?: string;
  error?: string;
}

export type WsEvent = WsHealthUpdate | WsLogUpdate | WsConsoleStatus;

// ── Pagination ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
