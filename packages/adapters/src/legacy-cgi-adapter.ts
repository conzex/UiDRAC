/**
 * legacy-cgi-adapter.ts — iDRAC 6 adapter using /cgi-bin/webcgi/ endpoints.
 * Oldest generation with limited feature support.
 */
import type {
  IdracAdapter, IdracGeneration, SystemInfo, HealthInfo, LogEntry,
  StorageInfo, NetworkInfo, PowerState, IdracUser, FirmwareInfo,
  SensorReading, SelEntry, ConsoleLaunch, PowerAction,
  BiosConfig, VirtualMediaStatus, IdracNetworkConfig, PowerReading,
  ThermalInfo, MemoryDimm, CpuInfo, PcieDevice, LcJob,
  CertificateInfo, LicenseInfo, ScpExportResult,
} from '@idrac/shared';
import { CGI_PATHS } from '@idrac/shared';
import { createHttpClient } from './http-client';
import type { AxiosInstance } from 'axios';

function extractCgiValue(html: string, field: string): string {
  const re = new RegExp(`${field}[\\s:=]+["']?([^"'<\\n]+)`, 'i');
  const m = html.match(re);
  return m?.[1]?.trim() ?? '';
}

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
    const res = await this.http.post(CGI_PATHS.LOGIN,
      `user=${encodeURIComponent(this.http.defaults.auth!.username)}&password=${encodeURIComponent(this.http.defaults.auth!.password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const cookie = res.headers['set-cookie']?.[0];
    if (cookie) this.http.defaults.headers.common['Cookie'] = cookie.split(';')[0];
  }

  async disconnect(): Promise<void> {}

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const { data } = await this.http.get(CGI_PATHS.SYSINFO);
      const html = typeof data === 'string' ? data : JSON.stringify(data);
      return {
        model: extractCgiValue(html, 'System Model') || 'PowerEdge (iDRAC 6)',
        manufacturer: 'Dell Inc.',
        serviceTag: extractCgiValue(html, 'Service Tag') || '',
        expressServiceCode: extractCgiValue(html, 'Express Service Code') || null,
        hostName: extractCgiValue(html, 'Host Name') || null,
        osName: extractCgiValue(html, 'Operating System') || null,
        osVersion: null,
        biosVersion: extractCgiValue(html, 'BIOS Version') || '',
        cpuModel: extractCgiValue(html, 'Processor') || '',
        cpuCount: parseInt(extractCgiValue(html, 'Processor Count')) || 0,
        totalMemoryGB: parseInt(extractCgiValue(html, 'System Memory')) || 0,
        powerState: 'unknown',
      };
    } catch {
      return {
        model: 'PowerEdge (iDRAC 6)', manufacturer: 'Dell Inc.', serviceTag: '', expressServiceCode: null,
        hostName: null, osName: null, osVersion: null, biosVersion: '', cpuModel: '', cpuCount: 0,
        totalMemoryGB: 0, powerState: 'unknown',
      };
    }
  }

  async getHealth(): Promise<HealthInfo> {
    return { overall: 'unknown', aspects: [{ aspect: 'overall', status: 'unknown', message: 'iDRAC 6 provides limited health reporting' }] };
  }

  async getLogs(opts?: { limit?: number }): Promise<LogEntry[]> {
    const limit = opts?.limit ?? 50;
    try {
      const { data } = await this.http.get(CGI_PATHS.SEL);
      const html = typeof data === 'string' ? data : JSON.stringify(data);
      const entries: LogEntry[] = [];
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      for (let i = 0; i < Math.min(rows.length, limit); i++) {
        const cells = rows[i].match(/<td[^>]*>([^<]*)<\/td>/gi) || [];
        const values = cells.map((c: string) => c.replace(/<[^>]+>/g, '').trim());
        if (values.length >= 3) {
          entries.push({
            id: values[0] || String(i),
            severity: values[1]?.toLowerCase()?.includes('critical') ? 'critical' : values[1]?.toLowerCase()?.includes('warn') ? 'warning' : 'informational',
            message: values[2] || '',
            timestamp: new Date(values[3] || ''),
          });
        }
      }
      return entries;
    } catch { return []; }
  }

  async getStorage(): Promise<StorageInfo> { return { controllers: [], physicalDisks: [], virtualDisks: [] }; }
  async getNetwork(): Promise<NetworkInfo> { return { interfaces: [] }; }
  async getPower(): Promise<PowerState> { return 'unknown'; }
  async getUsers(): Promise<IdracUser[]> { return []; }
  async createUser(_name: string, _password: string, _privilege: string): Promise<void> {}
  async deleteUser(_userId: number): Promise<void> {}
  async updateUserPassword(_userId: number, _password: string): Promise<void> {}
  async getFirmware(): Promise<FirmwareInfo> { return { idracVersion: '', biosVersion: '', lifecycleControllerVersion: null, components: [] }; }

  async powerAction(action: PowerAction): Promise<void> {
    const map: Record<string, string> = { on: '1', off: '2', 'graceful-shutdown': '3', reset: '4', nmi: '5', cycle: '6' };
    await this.http.post('/cgi-bin/webcgi/power', `action=${map[action] ?? '4'}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async setIdentify(_on: boolean): Promise<void> {}
  async getConsoleUrl(): Promise<ConsoleLaunch> { return { type: 'novnc', url: `/console/${this.ip}/vnc.html`, generation: '6' }; }

  async getVirtualMedia(): Promise<VirtualMediaStatus> {
    return { cd: { inserted: false, image: null, connectedVia: null }, removableDisk: { inserted: false, image: null, connectedVia: null } };
  }
  async mountVirtualMedia(_iso: string): Promise<void> {}
  async ejectVirtualMedia(): Promise<void> {}

  async getSensors(): Promise<SensorReading[]> { return []; }
  async getSel(): Promise<SelEntry[]> { return []; }

  async getPowerReadings(): Promise<PowerReading> {
    return { currentWatts: 0, maxWatts: 0, minWatts: 0, averageWatts: 0, powerCap: null, powerCapEnabled: false, powerSupplies: [] };
  }
  async getThermal(): Promise<ThermalInfo> { return { fans: [], temperatures: [] }; }
  async setPowerCap(_watts: number | null): Promise<void> {}
  async getBiosConfig(): Promise<BiosConfig> { return { attributes: [], pendingChanges: [], bootOrder: [], bootMode: 'unknown' }; }
  async setBiosAttributes(_attrs: Record<string, string>): Promise<void> {}
  async setBootOrder(_order: string[]): Promise<void> {}
  async getIdracNetwork(): Promise<IdracNetworkConfig> {
    return { dhcpEnabled: false, ipAddress: '', subnetMask: '', gateway: '', dnsServers: [], macAddress: '', vlanId: null, vlanEnabled: false, hostname: '', domainName: '' };
  }
  async setIdracNetwork(_config: Partial<IdracNetworkConfig>): Promise<void> {}
  async getMemory(): Promise<MemoryDimm[]> { return []; }
  async getCpus(): Promise<CpuInfo[]> { return []; }
  async getPcieDevices(): Promise<PcieDevice[]> { return []; }
  async getLcJobs(): Promise<LcJob[]> { return []; }
  async deleteLcJob(_jobId: string): Promise<void> {}
  async clearLcJobs(): Promise<void> {}
  async getCertificates(): Promise<CertificateInfo[]> { return []; }
  async getLicenses(): Promise<LicenseInfo[]> { return []; }
  async exportScp(_format: 'xml' | 'json'): Promise<ScpExportResult> {
    return { filename: 'not_supported', format: _format, content: 'SCP export not available on iDRAC 6', exportedAt: new Date() };
  }
}
