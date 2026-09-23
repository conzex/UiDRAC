/**
 * types.ts — Core TypeScript types used across all services.
 * Full iDRAC feature support for Gen 6/7/8/9.
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
  idracFirmware?: string;
  idracMac?: string;
  lifecycleControllerVersion?: string;
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
  cacheSize?: string;
  pciSlot?: string;
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
  protocol?: string;
  speed?: string;
  manufacturer?: string;
  predictedFailure?: boolean;
}

export interface VirtualDisk {
  id: string;
  name: string;
  raidLevel: string;
  capacityGB: number;
  status: HealthStatus;
  controllerId: string;
  stripeSize?: string;
  readPolicy?: string;
  writePolicy?: string;
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
  fqdn?: string;
  gateway?: string;
  subnetMask?: string;
  dnsServers?: string[];
  vlanId?: number;
  vlanEnabled?: boolean;
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
  componentId?: string;
  installDate?: string;
}

export interface SensorReading {
  name: string;
  value: number;
  unit: string;
  status: HealthStatus;
  thresholdWarning?: number;
  thresholdCritical?: number;
  location?: string;
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

// ── BIOS Configuration ──

export interface BiosAttribute {
  name: string;
  value: string;
  type: 'string' | 'integer' | 'enumeration' | 'boolean';
  allowedValues?: string[];
  readOnly: boolean;
  group?: string;
  description?: string;
}

export interface BiosConfig {
  attributes: BiosAttribute[];
  pendingChanges: BiosAttribute[];
  bootOrder: BootDevice[];
  bootMode: 'uefi' | 'bios' | 'unknown';
}

export interface BootDevice {
  id: string;
  name: string;
  enabled: boolean;
  index: number;
}

// ── Virtual Media ──

export interface VirtualMediaStatus {
  cd: { inserted: boolean; image: string | null; connectedVia: string | null };
  removableDisk: { inserted: boolean; image: string | null; connectedVia: string | null };
}

// ── iDRAC Network Settings ──

export interface IdracNetworkConfig {
  dhcpEnabled: boolean;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dnsServers: string[];
  macAddress: string;
  vlanId: number | null;
  vlanEnabled: boolean;
  hostname: string;
  domainName: string;
}

// ── Power / Thermal ──

export interface PowerReading {
  currentWatts: number;
  maxWatts: number;
  minWatts: number;
  averageWatts: number;
  powerCap: number | null;
  powerCapEnabled: boolean;
  powerSupplies: PowerSupply[];
}

export interface PowerSupply {
  name: string;
  model: string;
  serialNumber: string;
  wattage: number;
  status: HealthStatus;
  inputVoltage: number | null;
  firmwareVersion: string;
}

export interface ThermalInfo {
  fans: FanReading[];
  temperatures: TemperatureReading[];
}

export interface FanReading {
  name: string;
  rpm: number;
  status: HealthStatus;
  minRpm?: number;
  maxRpm?: number;
}

export interface TemperatureReading {
  name: string;
  celsius: number;
  status: HealthStatus;
  upperWarning?: number;
  upperCritical?: number;
  location?: string;
}

// ── Memory Inventory ──

export interface MemoryDimm {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  serialNumber: string;
  capacityGB: number;
  speedMHz: number;
  type: string;
  status: HealthStatus;
  slot: string;
}

// ── PCIe Devices ──

export interface PcieDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  slotType: string;
  busWidth: string;
  status: HealthStatus;
}

// ── CPU Inventory ──

export interface CpuInfo {
  id: string;
  model: string;
  manufacturer: string;
  cores: number;
  threads: number;
  maxSpeedMHz: number;
  currentSpeedMHz: number;
  status: HealthStatus;
  socket: string;
  architecture: string;
  cache: { l1KB: number; l2KB: number; l3KB: number };
}

// ── Lifecycle Controller Jobs ──

export interface LcJob {
  id: string;
  name: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  percentComplete: number;
  message: string;
  startTime: Date | null;
  endTime: Date | null;
  jobType: string;
}

// ── Certificate Info ──

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  thumbprint: string;
  type: 'ssl' | 'ca' | 'client';
}

// ── License Info ──

export interface LicenseInfo {
  id: string;
  type: string;
  description: string;
  status: 'active' | 'expired' | 'evaluation';
  expirationDate: Date | null;
  entitlementId: string;
}

// ── Server Configuration Profile ──

export interface ScpExportResult {
  filename: string;
  format: 'xml' | 'json';
  content: string;
  exportedAt: Date;
}

// ── Extended iDRAC Adapter Interface ──

export interface IdracAdapter {
  readonly generation: IdracGeneration;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Core
  getSystemInfo(): Promise<SystemInfo>;
  getHealth(): Promise<HealthInfo>;
  getLogs(opts?: { limit?: number; since?: Date }): Promise<LogEntry[]>;
  getStorage(): Promise<StorageInfo>;
  getNetwork(): Promise<NetworkInfo>;
  getPower(): Promise<PowerState>;
  getFirmware(): Promise<FirmwareInfo>;
  getSensors(): Promise<SensorReading[]>;
  getSel(): Promise<SelEntry[]>;

  // Power & Thermal
  powerAction(action: PowerAction): Promise<void>;
  setIdentify(on: boolean): Promise<void>;
  getPowerReadings(): Promise<PowerReading>;
  getThermal(): Promise<ThermalInfo>;
  setPowerCap(watts: number | null): Promise<void>;

  // Users
  getUsers(): Promise<IdracUser[]>;
  createUser(name: string, password: string, privilege: string): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  updateUserPassword(userId: number, password: string): Promise<void>;

  // Console
  getConsoleUrl(): Promise<ConsoleLaunch>;

  // Virtual Media
  getVirtualMedia(): Promise<VirtualMediaStatus>;
  mountVirtualMedia(iso: string): Promise<void>;
  ejectVirtualMedia(): Promise<void>;

  // BIOS
  getBiosConfig(): Promise<BiosConfig>;
  setBiosAttributes(attrs: Record<string, string>): Promise<void>;
  setBootOrder(order: string[]): Promise<void>;

  // iDRAC Network
  getIdracNetwork(): Promise<IdracNetworkConfig>;
  setIdracNetwork(config: Partial<IdracNetworkConfig>): Promise<void>;

  // Inventory
  getMemory(): Promise<MemoryDimm[]>;
  getCpus(): Promise<CpuInfo[]>;
  getPcieDevices(): Promise<PcieDevice[]>;

  // Lifecycle Controller
  getLcJobs(): Promise<LcJob[]>;
  deleteLcJob(jobId: string): Promise<void>;
  clearLcJobs(): Promise<void>;

  // Certificates
  getCertificates(): Promise<CertificateInfo[]>;

  // License
  getLicenses(): Promise<LicenseInfo[]>;

  // SCP
  exportScp(format: 'xml' | 'json'): Promise<ScpExportResult>;
}

// ── API Request/Response types ──

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
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
