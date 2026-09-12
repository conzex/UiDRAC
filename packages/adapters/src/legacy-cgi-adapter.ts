/**
 * legacy-cgi-adapter.ts — iDRAC 6 adapter using /cgi-bin/webcgi/ endpoints.
 */
import type {
  IdracAdapter, IdracGeneration, SystemInfo, HealthInfo, LogEntry,
  StorageInfo, NetworkInfo, PowerState, IdracUser, FirmwareInfo,
  SensorReading, SelEntry, ConsoleLaunch, PowerAction,
} from '@idrac/shared';
import { createHttpClient } from './http-client';
import type { AxiosInstance } from 'axios';

export class LegacyCgiAdapter implements IdracAdapter {
  readonly generation: IdracGeneration = '6';
  private ip: string;
  private http: AxiosInstance;

  constructor(ip: string, username: string, password: string) {
    this.ip = ip;
    this.http = createHttpClient(ip);
    this.http.defaults.auth = { username, password };
  }

  async connect(): Promise<void> {
    await this.http.post('/cgi-bin/webcgi/login', `user=${encodeURIComponent(this.http.defaults.auth!.username)}&password=${encodeURIComponent(this.http.defaults.auth!.password)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  }
  async disconnect(): Promise<void> {}

  async getSystemInfo(): Promise<SystemInfo> {
    return { model: 'PowerEdge (iDRAC 6)', manufacturer: 'Dell Inc.', serviceTag: '', expressServiceCode: null, hostName: null, osName: null, osVersion: null, biosVersion: '', cpuModel: '', cpuCount: 0, totalMemoryGB: 0, powerState: 'unknown' };
  }

  async getHealth(): Promise<HealthInfo> { return { overall: 'unknown', aspects: [{ aspect: 'overall', status: 'unknown' }] }; }
  async getLogs(): Promise<LogEntry[]> { return []; }
  async getStorage(): Promise<StorageInfo> { return { controllers: [], physicalDisks: [], virtualDisks: [] }; }
  async getNetwork(): Promise<NetworkInfo> { return { interfaces: [] }; }
  async getPower(): Promise<PowerState> { return 'unknown'; }
  async getUsers(): Promise<IdracUser[]> { return []; }
  async getFirmware(): Promise<FirmwareInfo> { return { idracVersion: '', biosVersion: '', lifecycleControllerVersion: null, components: [] }; }
  async powerAction(_a: PowerAction): Promise<void> {}
  async setIdentify(_on: boolean): Promise<void> {}
  async getConsoleUrl(): Promise<ConsoleLaunch> { return { type: 'novnc', url: `/console/${this.ip}/vnc.html`, generation: '6' }; }
  async mountVirtualMedia(_iso: string): Promise<void> {}
  async ejectVirtualMedia(): Promise<void> {}
  async getSensors(): Promise<SensorReading[]> { return []; }
  async getSel(): Promise<SelEntry[]> { return []; }
}
