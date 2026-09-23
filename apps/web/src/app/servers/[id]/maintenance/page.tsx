/** Maintenance page — Firmware, Sensors, Logs, Power Control, Thermal, Power Readings. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Info, AlertTriangle, AlertOctagon, RefreshCw, Thermometer, Zap, Wind, Power } from 'lucide-react';
import api from '@/lib/api';

const sevIcons: Record<string, any> = { informational: Info, warning: AlertTriangle, critical: AlertOctagon };

type Tab = 'firmware' | 'sensors' | 'logs' | 'power' | 'thermal';

export default function MaintenancePage() {
  const { id } = useParams() as { id: string };
  const [tab, setTab] = useState<Tab>('firmware');
  const [firmware, setFirmware] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [powerReadings, setPowerReadings] = useState<any>(null);
  const [thermal, setThermal] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [powerMsg, setPowerMsg] = useState('');
  const [powerCapInput, setPowerCapInput] = useState('');

  const fetchData = () => {
    setLoading(true); setError('');
    Promise.all([
      api.get(`/servers/${id}/firmware`).then((r) => setFirmware(r.data)).catch(() => {}),
      api.get(`/servers/${id}/logs`).then((r) => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
      api.get(`/servers/${id}/sensors`).then((r) => setSensors(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
      api.get(`/servers/${id}/power/readings`).then((r) => setPowerReadings(r.data)).catch(() => {}),
      api.get(`/servers/${id}/thermal`).then((r) => setThermal(r.data)).catch(() => {}),
    ]).catch((err) => setError(err?.response?.data?.message || 'Unable to load maintenance data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePower = async (action: string) => {
    setPowerMsg('');
    try {
      await api.post(`/servers/${id}/power`, { action });
      setPowerMsg(`Power action "${action}" sent successfully.`);
    } catch (err: any) { setPowerMsg(err?.response?.data?.message || `Failed: "${action}".`); }
  };

  const handlePowerCap = async () => {
    try {
      const watts = powerCapInput === '' ? null : parseInt(powerCapInput);
      await api.patch(`/servers/${id}/power/cap`, { watts });
      setPowerMsg(watts ? `Power cap set to ${watts}W.` : 'Power cap removed.');
      fetchData();
    } catch (err: any) { setPowerMsg(err?.response?.data?.message || 'Failed to set power cap.'); }
  };

  const tabs: [Tab, any, string][] = [
    ['firmware', Zap, 'Firmware'], ['sensors', Thermometer, 'Sensors'],
    ['logs', Info, 'Event Log'], ['power', Power, 'Power'], ['thermal', Wind, 'Thermal'],
  ];

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  if (error && !firmware && logs.length === 0 && sensors.length === 0) return (
    <div className="bg-red-50 border border-red-200 rounded p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-red-critical mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-text-primary mb-2">Unable to Load Maintenance Data</h2>
      <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">{error}</p>
      <button onClick={fetchData} className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-0 bg-white border border-border-card rounded-t overflow-hidden">
        {tabs.map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-dell-blue text-dell-blue bg-blue-50/30' : 'border-transparent text-text-secondary hover:text-dell-blue'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Firmware */}
      {tab === 'firmware' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Firmware Inventory</h2></div>
          {firmware?.components?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">Component</th><th className="text-left p-3">Version</th><th className="text-left p-3">Updateable</th><th className="text-left p-3">Install Date</th></tr></thead>
              <tbody>{firmware.components.map((c: any, i: number) => (
                <tr key={i} className="border-t border-border-card">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.version}</td>
                  <td className="p-3">{c.updateable ? <span className="text-green-healthy">Yes</span> : '—'}</td>
                  <td className="p-3 text-text-secondary text-xs">{c.installDate || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No firmware inventory available</p>}
        </div>
      )}

      {/* Sensors */}
      {tab === 'sensors' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Sensor Readings</h2></div>
          {sensors.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">Sensor</th><th className="text-left p-3">Value</th><th className="text-left p-3">Location</th><th className="text-left p-3">Warning</th><th className="text-left p-3">Critical</th><th className="text-left p-3">Status</th></tr></thead>
              <tbody>{sensors.map((s: any, i: number) => (
                <tr key={i} className="border-t border-border-card">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3 font-mono">{s.value} {s.unit}</td>
                  <td className="p-3 text-text-secondary text-xs">{s.location || '—'}</td>
                  <td className="p-3 text-xs">{s.thresholdWarning ?? '—'}</td>
                  <td className="p-3 text-xs">{s.thresholdCritical ?? '—'}</td>
                  <td className={`p-3 capitalize ${s.status === 'healthy' ? 'text-green-healthy' : s.status === 'warning' ? 'text-amber-warning' : s.status === 'critical' ? 'text-red-critical' : ''}`}>{s.status}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No sensor data available</p>}
        </div>
      )}

      {/* Event Log */}
      {tab === 'logs' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">System Event Log</h2></div>
          {logs.length > 0 ? (
            <div className="divide-y divide-border-card">{logs.map((l: any, i: number) => {
              const SevIcon = sevIcons[l.severity] || Info;
              const sevColor = l.severity === 'critical' ? 'text-red-critical' : l.severity === 'warning' ? 'text-amber-warning' : 'text-dell-blue';
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                  <div className="flex-1"><p className="text-sm">{l.message}</p><p className="text-xs text-text-secondary">{new Date(l.timestamp).toLocaleString()}{l.source ? ` · ${l.source}` : ''}</p></div>
                </div>
              );
            })}</div>
          ) : <p className="text-sm text-text-secondary text-center py-6">No system event log entries</p>}
        </div>
      )}

      {/* Power */}
      {tab === 'power' && (
        <div className="space-y-4">
          {/* Power Readings */}
          {powerReadings && (
            <div className="bg-white border border-border-card rounded">
              <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Power Consumption</h2></div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Current', value: `${powerReadings.currentWatts}W`, color: 'text-dell-blue' },
                    { label: 'Average', value: `${powerReadings.averageWatts}W`, color: 'text-text-primary' },
                    { label: 'Peak', value: `${powerReadings.maxWatts}W`, color: 'text-amber-warning' },
                    { label: 'Min', value: `${powerReadings.minWatts}W`, color: 'text-green-healthy' },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-3 border border-border-card rounded">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-text-secondary mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Power Cap */}
                <div className="flex items-center gap-3 border-t border-border-card pt-4">
                  <span className="text-sm text-text-secondary">Power Cap:</span>
                  <span className="text-sm font-medium">{powerReadings.powerCapEnabled ? `${powerReadings.powerCap}W` : 'Disabled'}</span>
                  <input value={powerCapInput} onChange={(e) => setPowerCapInput(e.target.value)} placeholder="Watts" className="px-2 py-1 border border-border-card rounded text-sm w-24" />
                  <button onClick={handlePowerCap} className="px-3 py-1 bg-dell-blue text-white text-xs rounded hover:bg-dell-blue-hover">Set</button>
                  <button onClick={() => { setPowerCapInput(''); handlePowerCap(); }} className="px-3 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200">Remove</button>
                </div>
                {/* Power Supplies */}
                {powerReadings.powerSupplies?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase text-text-secondary mb-2">Power Supplies</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="bg-row-alt"><th className="text-left p-2">Name</th><th className="text-left p-2">Model</th><th className="text-left p-2">Wattage</th><th className="text-left p-2">Input V</th><th className="text-left p-2">Status</th></tr></thead>
                      <tbody>{powerReadings.powerSupplies.map((ps: any, i: number) => (
                        <tr key={i} className="border-t border-border-card">
                          <td className="p-2">{ps.name}</td>
                          <td className="p-2 text-xs">{ps.model}</td>
                          <td className="p-2">{ps.wattage}W</td>
                          <td className="p-2">{ps.inputVoltage ? `${ps.inputVoltage}V` : '—'}</td>
                          <td className="p-2 capitalize text-green-healthy">{ps.status}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Power Control */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Power Control</h2></div>
            <div className="p-4">
              <div className="flex gap-3 flex-wrap">
                {[
                  { action: 'on', label: 'Power On', color: 'bg-green-600 hover:bg-green-700' },
                  { action: 'graceful-shutdown', label: 'Graceful Shutdown', color: 'bg-amber-500 hover:bg-amber-600' },
                  { action: 'reset', label: 'Reset', color: 'bg-dell-blue hover:bg-dell-blue-hover' },
                  { action: 'cycle', label: 'Power Cycle', color: 'bg-orange-500 hover:bg-orange-600' },
                  { action: 'nmi', label: 'NMI', color: 'bg-red-600 hover:bg-red-700' },
                ].map((btn) => (
                  <button key={btn.action} onClick={() => handlePower(btn.action)} className={`px-4 py-2 ${btn.color} text-white text-sm rounded font-medium`}>
                    {btn.label}
                  </button>
                ))}
              </div>
              {powerMsg && <p className="text-sm mt-3 text-text-secondary">{powerMsg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Thermal */}
      {tab === 'thermal' && thermal && (
        <div className="space-y-4">
          {/* Temperatures */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <h2 className="text-[13px] font-bold uppercase tracking-wide">Temperature Sensors</h2>
            </div>
            {thermal.temperatures?.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="bg-row-alt"><th className="text-left p-3">Sensor</th><th className="text-left p-3">Reading</th><th className="text-left p-3">Location</th><th className="text-left p-3">Warning</th><th className="text-left p-3">Critical</th><th className="text-left p-3">Status</th></tr></thead>
                <tbody>{thermal.temperatures.map((t: any, i: number) => (
                  <tr key={i} className="border-t border-border-card">
                    <td className="p-3">{t.name}</td>
                    <td className="p-3 font-mono font-semibold">{t.celsius}°C</td>
                    <td className="p-3 text-xs text-text-secondary">{t.location || '—'}</td>
                    <td className="p-3 text-xs">{t.upperWarning ? `${t.upperWarning}°C` : '—'}</td>
                    <td className="p-3 text-xs">{t.upperCritical ? `${t.upperCritical}°C` : '—'}</td>
                    <td className={`p-3 capitalize ${t.status === 'healthy' ? 'text-green-healthy' : t.status === 'warning' ? 'text-amber-warning' : t.status === 'critical' ? 'text-red-critical' : ''}`}>{t.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-text-secondary text-center py-6">No temperature data available</p>}
          </div>
          {/* Fans */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              <h2 className="text-[13px] font-bold uppercase tracking-wide">Fan Status</h2>
            </div>
            {thermal.fans?.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="bg-row-alt"><th className="text-left p-3">Fan</th><th className="text-left p-3">Speed (RPM)</th><th className="text-left p-3">Status</th></tr></thead>
                <tbody>{thermal.fans.map((f: any, i: number) => (
                  <tr key={i} className="border-t border-border-card">
                    <td className="p-3">{f.name}</td>
                    <td className="p-3 font-mono font-semibold">{f.rpm}</td>
                    <td className={`p-3 capitalize ${f.status === 'healthy' ? 'text-green-healthy' : f.status === 'warning' ? 'text-amber-warning' : f.status === 'critical' ? 'text-red-critical' : ''}`}>{f.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-text-secondary text-center py-6">No fan data available</p>}
          </div>
        </div>
      )}
    </div>
  );
}
