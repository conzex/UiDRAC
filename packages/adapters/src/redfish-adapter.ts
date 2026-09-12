/**
 * redfish-adapter.ts — iDRAC 8/9 adapter using Redfish REST API.
 */
import type {
  IdracAdapter, IdracGeneration, SystemInfo, HealthInfo, LogEntry,
  StorageInfo, NetworkInfo, PowerState, IdracUser, FirmwareInfo,
  SensorReading, SelEntry, ConsoleLaunch, PowerAction, HealthStatus,
} from '@idrac/shared';
import { REDFISH_PATHS } from '@idrac/shared';
import { createHttpClient } from './http-client';
import type { AxiosInstance } from 'axios';

export class RedfishAdapter implements IdracAdapter {
  readonly generation: IdracGeneration;
  private ip: string;
  private username: string;
  private password: string;
  private http: AxiosInstance;
  private token: string | null = null;

  constructor(ip: string, username: string, password: string, generation: IdracGeneration = '9') {
    this.ip = ip;
    this.username = username;
    this.password = password;
    this.generation = generation;
    this.http = createHttpClient(ip);
  }

  async connect(): Promise<void> {
    const res = await this.http.post(REDFISH_PATHS.SESSIONS, {
      UserName: this.username, Password: this.password,
    });
    this.token = res.headers['x-auth-token'] as string;
    this.http.defaults.headers.common['X-Auth-Token'] = this.token;
  }

  async disconnect(): Promise<void> {
    this.token = null;
    delete this.http.defaults.headers.common['X-Auth-Token'];
  }

  private mapHealth(s: string | undefined): HealthStatus {
    if (!s) return 'unknown';
    const lower = s.toLowerCase();
    if (lower === 'ok' || lower === 'healthy') return 'healthy';
    if (lower === 'warning') return 'warning';
    if (lower === 'critical') return 'critical';
    return 'unknown';
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const { data } = await this.http.get(REDFISH_PATHS.SYSTEMS);
    return {
      model: data.Model ?? 'Unknown',
      manufacturer: data.Manufacturer ?? 'Dell Inc.',
      serviceTag: data.SKU ?? data.SerialNumber ?? '',
      expressServiceCode: null,
      hostName: data.HostName ?? null,
      osName: data.Oem?.Dell?.DellSystem?.OperatingSystem ?? null,
      osVersion: null,
      biosVersion: data.BiosVersion ?? '',
      cpuModel: data.ProcessorSummary?.Model ?? '',
      cpuCount: data.ProcessorSummary?.Count ?? 0,
      totalMemoryGB: (data.MemorySummary?.TotalSystemMemoryGiB ?? 0),
      powerState: data.PowerState?.toLowerCase() === 'on' ? 'on' : 'off',
    };
  }

  async getHealth(): Promise<HealthInfo> {
    const { data } = await this.http.get(REDFISH_PATHS.SYSTEMS);
    const overall = this.mapHealth(data.Status?.Health);
    return {
      overall,
      aspects: [
        { aspect: 'overall', status: overall },
        { aspect: 'cpu', status: this.mapHealth(data.ProcessorSummary?.Status?.Health) },
        { aspect: 'memory', status: this.mapHealth(data.MemorySummary?.Status?.Health) },
        { aspect: 'storage', status: 'healthy' },
        { aspect: 'network', status: 'healthy' },
        { aspect: 'fan', status: 'healthy' },
        { aspect: 'power-supply', status: 'healthy' },
        { aspect: 'temperature', status: 'healthy' },
      ],
    };
  }

  async getLogs(opts?: { limit?: number }): Promise<LogEntry[]> {
    const limit = opts?.limit ?? 50;
    try {
      const { data } = await this.http.get(`${REDFISH_PATHS.MANAGERS}/LogServices/Sel/Entries?$top=${limit}`);
      return (data.Members ?? []).map((e: Record<string, unknown>) => ({
        id: String(e.Id ?? ''),
        severity: String(e.Severity ?? 'informational').toLowerCase() as LogEntry['severity'],
        message: String(e.Message ?? ''),
        timestamp: new Date(String(e.Created ?? '')),
        source: String(e.SensorType ?? ''),
      }));
    } catch { return []; }
  }

  async getStorage(): Promise<StorageInfo> {
    try {
      const { data } = await this.http.get(REDFISH_PATHS.STORAGE);
      const controllers = (data.Members ?? []).map((m: Record<string, string>) => ({
        id: m['@odata.id'] ?? '', name: 'RAID Controller', model: '', firmwareVersion: '', status: 'healthy' as const,
      }));
      return { controllers, physicalDisks: [], virtualDisks: [] };
    } catch { return { controllers: [], physicalDisks: [], virtualDisks: [] }; }
  }

  async getNetwork(): Promise<NetworkInfo> {
    try {
      const { data } = await this.http.get(REDFISH_PATHS.ETHERNET);
      const interfaces = (data.Members ?? []).map((m: Record<string, unknown>) => ({
        id: String(m['@odata.id'] ?? ''), name: 'NIC', macAddress: '', ipAddress: null, speedMbps: null, status: 'up' as const, linkStatus: 'up' as const,
      }));
      return { interfaces };
    } catch { return { interfaces: [] }; }
  }

  async getPower(): Promise<PowerState> {
    const { data } = await this.http.get(REDFISH_PATHS.SYSTEMS);
    return data.PowerState?.toLowerCase() === 'on' ? 'on' : 'off';
  }

  async getUsers(): Promise<IdracUser[]> {
    try {
      const { data } = await this.http.get(`${REDFISH_PATHS.MANAGERS}/Accounts`);
      return (data.Members ?? []).map((m: Record<string, unknown>, i: number) => ({
        id: i + 1, name: String(m.UserName ?? ''), enabled: true, privilege: 'Administrator',
      }));
    } catch { return []; }
  }

  async getFirmware(): Promise<FirmwareInfo> {
    try {
      const { data } = await this.http.get(`${REDFISH_PATHS.UPDATE_SERVICE}/FirmwareInventory`);
      const components = (data.Members ?? []).map((m: Record<string, unknown>) => ({
        name: String(m.Name ?? ''), version: String(m.Version ?? ''), updateable: true,
      }));
      return { idracVersion: '', biosVersion: '', lifecycleControllerVersion: null, components };
    } catch { return { idracVersion: '', biosVersion: '', lifecycleControllerVersion: null, components: [] }; }
  }

  async powerAction(action: PowerAction): Promise<void> {
    const map: Record<string, string> = {
      on: 'On', off: 'ForceOff', 'graceful-shutdown': 'GracefulShutdown',
      reset: 'ForceRestart', nmi: 'Nmi', cycle: 'PowerCycle',
    };
    await this.http.post(`${REDFISH_PATHS.SYSTEMS}/Actions/ComputerSystem.Reset`, {
      ResetType: map[action] ?? 'ForceRestart',
    });
  }

  async setIdentify(on: boolean): Promise<void> {
    await this.http.patch(REDFISH_PATHS.SYSTEMS, { IndicatorLED: on ? 'Blinking' : 'Off' });
  }

  async getConsoleUrl(): Promise<ConsoleLaunch> {
    return { type: 'html5', url: `https://${this.ip}/console/console.html`, generation: this.generation };
  }

  async mountVirtualMedia(iso: string): Promise<void> {
    await this.http.post(`${REDFISH_PATHS.MANAGERS}/VirtualMedia/CD/Actions/VirtualMedia.InsertMedia`, { Image: iso });
  }

  async ejectVirtualMedia(): Promise<void> {
    await this.http.post(`${REDFISH_PATHS.MANAGERS}/VirtualMedia/CD/Actions/VirtualMedia.EjectMedia`, {});
  }

  async getSensors(): Promise<SensorReading[]> { return []; }
  async getSel(): Promise<SelEntry[]> { return (await this.getLogs()).map((l) => ({ ...l, component: l.source })); }
}
