/**
 * legacy-java-adapter.ts — iDRAC 7 adapter using legacy /data?get= endpoints.
 * Parses XML-like responses from the iDRAC 7 web interface.
 */
import type {
  IdracAdapter, IdracGeneration, SystemInfo, HealthInfo, LogEntry,
  StorageInfo, NetworkInfo, PowerState, IdracUser, FirmwareInfo,
  SensorReading, SelEntry, ConsoleLaunch, PowerAction, HealthStatus,
  BiosConfig, VirtualMediaStatus, IdracNetworkConfig, PowerReading,
  ThermalInfo, MemoryDimm, CpuInfo, PcieDevice, LcJob,
  CertificateInfo, LicenseInfo, ScpExportResult,
} from '@idrac/shared';
import { LEGACY_PATHS } from '@idrac/shared';
import { createHttpClient } from './http-client';
import type { AxiosInstance } from 'axios';

function extractXmlValue(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const m = xml.match(re);
  return m?.[1]?.trim() ?? '';
}

function extractXmlValues(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'gi');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function mapHealthStr(s: string): HealthStatus {
  if (!s) return 'unknown';
  const l = s.toLowerCase();
  if (l === 'ok' || l === '2' || l === 'healthy' || l === 'normal') return 'healthy';
  if (l === 'warning' || l === '3' || l === 'degraded') return 'warning';
  if (l === 'critical' || l === '4' || l === 'error') return 'critical';
  return 'unknown';
}

export class LegacyJavaAdapter implements IdracAdapter {
  readonly generation: IdracGeneration = '7';
  private ip: string;
  private http: AxiosInstance;
  private sessionToken: string | null = null;

  constructor(ip: string, username: string, password: string) {
    this.ip = ip;
    this.http = createHttpClient(ip);
    this.http.defaults.auth = { username, password };
  }

  async connect(): Promise<void> {
    const res = await this.http.post('/data/login',
      `user=${encodeURIComponent(this.http.defaults.auth!.username)}&password=${encodeURIComponent(this.http.defaults.auth!.password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const cookie = res.headers['set-cookie']?.[0];
    if (cookie) {
      this.sessionToken = cookie.split(';')[0];
      this.http.defaults.headers.common['Cookie'] = this.sessionToken;
    }
  }

  async disconnect(): Promise<void> {
    try { await this.http.get('/data/logout'); } catch { /* ok */ }
    this.sessionToken = null;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const { data } = await this.http.get(LEGACY_PATHS.SYSINFO);
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      return {
        model: extractXmlValue(xml, 'sysDesc') || extractXmlValue(xml, 'model') || 'PowerEdge (iDRAC 7)',
        manufacturer: 'Dell Inc.',
        serviceTag: extractXmlValue(xml, 'svctag') || extractXmlValue(xml, 'svcTag') || '',
        expressServiceCode: extractXmlValue(xml, 'expSvcCode') || null,
        hostName: extractXmlValue(xml, 'hostname') || extractXmlValue(xml, 'hostName') || null,
        osName: extractXmlValue(xml, 'osname') || null,
        osVersion: extractXmlValue(xml, 'osver') || null,
        biosVersion: extractXmlValue(xml, 'biosver') || extractXmlValue(xml, 'biosVer') || '',
        cpuModel: extractXmlValue(xml, 'cpuType') || '',
        cpuCount: parseInt(extractXmlValue(xml, 'cpuCount')) || 0,
        totalMemoryGB: parseInt(extractXmlValue(xml, 'memSize')) || 0,
        powerState: extractXmlValue(xml, 'pwState') === '1' ? 'on' : extractXmlValue(xml, 'pwState') === '0' ? 'off' : 'unknown',
        idracFirmware: extractXmlValue(xml, 'fwVersion') || '',
      };
    } catch {
      return {
        model: 'PowerEdge (iDRAC 7)', manufacturer: 'Dell Inc.', serviceTag: '', expressServiceCode: null,
        hostName: null, osName: null, osVersion: null, biosVersion: '', cpuModel: '', cpuCount: 0,
        totalMemoryGB: 0, powerState: 'unknown',
      };
    }
  }

  async getHealth(): Promise<HealthInfo> {
    try {
      const { data } = await this.http.get('/data?get=health');
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const overall = mapHealthStr(extractXmlValue(xml, 'overallHealth') || extractXmlValue(xml, 'globalStatus'));
      return {
        overall,
        aspects: [
          { aspect: 'overall', status: overall },
          { aspect: 'cpu', status: mapHealthStr(extractXmlValue(xml, 'cpuHealth')) },
          { aspect: 'memory', status: mapHealthStr(extractXmlValue(xml, 'memHealth')) },
          { aspect: 'storage', status: mapHealthStr(extractXmlValue(xml, 'storHealth')) },
          { aspect: 'network', status: mapHealthStr(extractXmlValue(xml, 'nicHealth')) },
          { aspect: 'fan', status: mapHealthStr(extractXmlValue(xml, 'fanHealth')) },
          { aspect: 'power-supply', status: mapHealthStr(extractXmlValue(xml, 'psHealth')) },
          { aspect: 'temperature', status: mapHealthStr(extractXmlValue(xml, 'tempHealth')) },
        ],
      };
    } catch {
      return { overall: 'unknown', aspects: [{ aspect: 'overall', status: 'unknown' }] };
    }
  }

  async getLogs(opts?: { limit?: number }): Promise<LogEntry[]> {
    const limit = opts?.limit ?? 50;
    try {
      const { data } = await this.http.get(LEGACY_PATHS.SEL);
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const ids = extractXmlValues(xml, 'id');
      const messages = extractXmlValues(xml, 'msg');
      const severities = extractXmlValues(xml, 'severity');
      const timestamps = extractXmlValues(xml, 'time');
      const entries: LogEntry[] = [];
      for (let i = 0; i < Math.min(ids.length, limit); i++) {
        entries.push({
          id: ids[i] || String(i),
          severity: severities[i] === '2' ? 'informational' : severities[i] === '3' ? 'warning' : severities[i] === '4' ? 'critical' : 'informational',
          message: messages[i] || '',
          timestamp: new Date(timestamps[i] || ''),
        });
      }
      return entries;
    } catch { return []; }
  }

  async getStorage(): Promise<StorageInfo> {
    try {
      const pdRes = await this.http.get(LEGACY_PATHS.PHYSICAL_DISKS).catch(() => ({ data: '' }));
      const vdRes = await this.http.get(LEGACY_PATHS.VIRTUAL_DISKS).catch(() => ({ data: '' }));
      const pdXml = typeof pdRes.data === 'string' ? pdRes.data : JSON.stringify(pdRes.data);
      const vdXml = typeof vdRes.data === 'string' ? vdRes.data : JSON.stringify(vdRes.data);

      const pdNames = extractXmlValues(pdXml, 'name');
      const pdModels = extractXmlValues(pdXml, 'model');
      const pdSizes = extractXmlValues(pdXml, 'size');
      const pdStates = extractXmlValues(pdXml, 'state');

      const physicalDisks = pdNames.map((name, i) => ({
        id: String(i), name, model: pdModels[i] || '', serialNumber: '',
        capacityGB: parseInt(pdSizes[i]) || 0, mediaType: 'HDD' as const,
        status: mapHealthStr(pdStates[i] || ''), controllerId: '0',
      }));

      const vdNames = extractXmlValues(vdXml, 'name');
      const vdRaids = extractXmlValues(vdXml, 'raidLevel');
      const vdSizes = extractXmlValues(vdXml, 'size');
      const vdStates = extractXmlValues(vdXml, 'state');

      const virtualDisks = vdNames.map((name, i) => ({
        id: String(i), name, raidLevel: vdRaids[i] || 'Unknown',
        capacityGB: parseInt(vdSizes[i]) || 0, status: mapHealthStr(vdStates[i] || ''), controllerId: '0',
      }));

      return {
        controllers: [{ id: '0', name: 'Integrated RAID Controller', model: 'PERC', firmwareVersion: '', status: 'healthy' as const }],
        physicalDisks, virtualDisks,
      };
    } catch { return { controllers: [], physicalDisks: [], virtualDisks: [] }; }
  }

  async getNetwork(): Promise<NetworkInfo> {
    try {
      const { data } = await this.http.get(LEGACY_PATHS.NIC);
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const names = extractXmlValues(xml, 'name');
      const macs = extractXmlValues(xml, 'mac');
      const ips = extractXmlValues(xml, 'ip');
      const speeds = extractXmlValues(xml, 'speed');
      return {
        interfaces: names.map((name, i) => ({
          id: String(i), name, macAddress: macs[i] || '', ipAddress: ips[i] || null,
          speedMbps: parseInt(speeds[i]) || null, status: 'up' as const, linkStatus: 'up' as const,
        })),
      };
    } catch { return { interfaces: [] }; }
  }

  async getPower(): Promise<PowerState> {
    try {
      const { data } = await this.http.get(LEGACY_PATHS.SYSINFO);
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const ps = extractXmlValue(xml, 'pwState');
      return ps === '1' ? 'on' : ps === '0' ? 'off' : 'unknown';
    } catch { return 'unknown'; }
  }

  async getUsers(): Promise<IdracUser[]> {
    try {
      const { data } = await this.http.get('/data?get=users');
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const names = extractXmlValues(xml, 'name');
      return names.filter(Boolean).map((name, i) => ({ id: i + 1, name, enabled: true, privilege: 'Administrator' }));
    } catch { return []; }
  }

  async createUser(name: string, password: string, _privilege: string): Promise<void> {
    await this.http.post('/data?set=user', `name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteUser(userId: number): Promise<void> {
    await this.http.post('/data?set=deleteUser', `id=${userId}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async updateUserPassword(userId: number, password: string): Promise<void> {
    await this.http.post('/data?set=userPassword', `id=${userId}&password=${encodeURIComponent(password)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async getFirmware(): Promise<FirmwareInfo> {
    try {
      const { data } = await this.http.get('/data?get=version');
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      return {
        idracVersion: extractXmlValue(xml, 'fwVersion') || '',
        biosVersion: extractXmlValue(xml, 'biosVer') || '',
        lifecycleControllerVersion: extractXmlValue(xml, 'lcVersion') || null,
        components: [
          { name: 'iDRAC', version: extractXmlValue(xml, 'fwVersion') || '', updateable: true },
          { name: 'BIOS', version: extractXmlValue(xml, 'biosVer') || '', updateable: true },
        ],
      };
    } catch { return { idracVersion: '', biosVersion: '', lifecycleControllerVersion: null, components: [] }; }
  }

  async powerAction(action: PowerAction): Promise<void> {
    const map: Record<string, string> = { on: '1', off: '2', 'graceful-shutdown': '3', reset: '4', nmi: '5', cycle: '6' };
    await this.http.post('/data?set=pwState', `pwState=${map[action] ?? '4'}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async setIdentify(on: boolean): Promise<void> {
    await this.http.post('/data?set=identify', `led=${on ? '1' : '0'}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async getConsoleUrl(): Promise<ConsoleLaunch> {
    return { type: 'novnc', url: `/console/${this.ip}/vnc.html`, generation: '7' };
  }

  async getSensors(): Promise<SensorReading[]> {
    try {
      const { data } = await this.http.get('/data?get=sensors');
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      const names = extractXmlValues(xml, 'name');
      const values = extractXmlValues(xml, 'reading');
      const units = extractXmlValues(xml, 'unit');
      const states = extractXmlValues(xml, 'status');
      return names.map((name, i) => ({
        name, value: parseFloat(values[i]) || 0, unit: units[i] || '',
        status: mapHealthStr(states[i] || ''),
      }));
    } catch { return []; }
  }

  async getSel(): Promise<SelEntry[]> {
    return (await this.getLogs()).map((l) => ({ ...l, component: l.source }));
  }

  async getVirtualMedia(): Promise<VirtualMediaStatus> {
    return { cd: { inserted: false, image: null, connectedVia: null }, removableDisk: { inserted: false, image: null, connectedVia: null } };
  }

  async mountVirtualMedia(iso: string): Promise<void> {
    await this.http.post('/data?set=vmedia', `image=${encodeURIComponent(iso)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async ejectVirtualMedia(): Promise<void> {
    await this.http.post('/data?set=vmediaEject', '', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async getPowerReadings(): Promise<PowerReading> {
    return { currentWatts: 0, maxWatts: 0, minWatts: 0, averageWatts: 0, powerCap: null, powerCapEnabled: false, powerSupplies: [] };
  }

  async getThermal(): Promise<ThermalInfo> {
    return { fans: [], temperatures: [] };
  }

  async setPowerCap(_watts: number | null): Promise<void> { /* not supported on Gen 7 */ }

  async getBiosConfig(): Promise<BiosConfig> {
    return { attributes: [], pendingChanges: [], bootOrder: [], bootMode: 'unknown' };
  }

  async setBiosAttributes(_attrs: Record<string, string>): Promise<void> { /* limited on Gen 7 */ }
  async setBootOrder(_order: string[]): Promise<void> { /* limited on Gen 7 */ }

  async getIdracNetwork(): Promise<IdracNetworkConfig> {
    try {
      const { data } = await this.http.get('/data?get=idracNetwork');
      const xml = typeof data === 'string' ? data : JSON.stringify(data);
      return {
        dhcpEnabled: extractXmlValue(xml, 'dhcp') === '1',
        ipAddress: extractXmlValue(xml, 'ip') || '',
        subnetMask: extractXmlValue(xml, 'subnet') || '',
        gateway: extractXmlValue(xml, 'gateway') || '',
        dnsServers: [extractXmlValue(xml, 'dns1'), extractXmlValue(xml, 'dns2')].filter(Boolean),
        macAddress: extractXmlValue(xml, 'mac') || '',
        vlanId: null, vlanEnabled: false,
        hostname: extractXmlValue(xml, 'hostname') || '',
        domainName: extractXmlValue(xml, 'domain') || '',
      };
    } catch {
      return { dhcpEnabled: false, ipAddress: '', subnetMask: '', gateway: '', dnsServers: [], macAddress: '', vlanId: null, vlanEnabled: false, hostname: '', domainName: '' };
    }
  }

  async setIdracNetwork(_config: Partial<IdracNetworkConfig>): Promise<void> { /* limited on Gen 7 */ }
  async getMemory(): Promise<MemoryDimm[]> { return []; }
  async getCpus(): Promise<CpuInfo[]> { return []; }
  async getPcieDevices(): Promise<PcieDevice[]> { return []; }
  async getLcJobs(): Promise<LcJob[]> { return []; }
  async deleteLcJob(_jobId: string): Promise<void> {}
  async clearLcJobs(): Promise<void> {}
  async getCertificates(): Promise<CertificateInfo[]> { return []; }
  async getLicenses(): Promise<LicenseInfo[]> { return []; }
  async exportScp(_format: 'xml' | 'json'): Promise<ScpExportResult> {
    return { filename: 'not_supported', format: _format, content: 'SCP export not available on iDRAC 7', exportedAt: new Date() };
  }
}
