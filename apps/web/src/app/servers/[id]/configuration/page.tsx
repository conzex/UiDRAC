/** Configuration page — BIOS Settings, Boot Order, Hardware Inventory. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Settings, HardDrive, Cpu, MemoryStick, Monitor, Search, Save, AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

type Tab = 'bios' | 'boot' | 'inventory';

export default function ConfigurationPage() {
  const { id } = useParams() as { id: string };
  const [tab, setTab] = useState<Tab>('bios');
  const [bios, setBios] = useState<any>(null);
  const [cpus, setCpus] = useState<any[]>([]);
  const [memory, setMemory] = useState<any[]>([]);
  const [pcie, setPcie] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editedAttrs, setEditedAttrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchData = () => {
    setLoading(true); setError('');
    Promise.all([
      api.get(`/servers/${id}/bios`).then((r) => setBios(r.data)).catch(() => {}),
      api.get(`/servers/${id}/cpus`).then((r) => setCpus(r.data || [])).catch(() => {}),
      api.get(`/servers/${id}/memory`).then((r) => setMemory(r.data || [])).catch(() => {}),
      api.get(`/servers/${id}/pcie`).then((r) => setPcie(r.data || [])).catch(() => {}),
    ]).catch((err) => setError(err?.response?.data?.message || 'Unable to load configuration from iDRAC.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    next.has(group) ? next.delete(group) : next.add(group);
    setExpandedGroups(next);
  };

  const handleSaveBios = async () => {
    if (Object.keys(editedAttrs).length === 0) return;
    setSaving(true); setSaveMsg('');
    try {
      await api.patch(`/servers/${id}/bios`, { attributes: editedAttrs });
      setSaveMsg('Changes submitted. A reboot is required to apply BIOS changes.');
      setEditedAttrs({});
      fetchData();
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.message || 'Failed to apply BIOS changes.');
    } finally { setSaving(false); }
  };

  const biosGroups = bios?.attributes?.reduce((acc: Record<string, any[]>, attr: any) => {
    const group = attr.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(attr);
    return acc;
  }, {} as Record<string, any[]>) ?? {};

  const filteredGroups = search
    ? Object.fromEntries(Object.entries(biosGroups).map(([g, attrs]) => [g, (attrs as any[]).filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.value?.toLowerCase()?.includes(search.toLowerCase()))]).filter(([, attrs]) => (attrs as any[]).length > 0))
    : biosGroups;

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  if (error && !bios) return (
    <div className="bg-red-50 border border-red-200 rounded p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-red-critical mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-text-primary mb-2">Unable to Load Configuration</h2>
      <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">{error}</p>
      <button onClick={fetchData} className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-0 bg-white border border-border-card rounded-t overflow-hidden">
        {([['bios', Settings, 'BIOS Settings'], ['boot', HardDrive, 'Boot Order'], ['inventory', Cpu, 'Hardware Inventory']] as [Tab, any, string][]).map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-dell-blue text-dell-blue bg-blue-50/30' : 'border-transparent text-text-secondary hover:text-dell-blue'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* BIOS Settings */}
      {tab === 'bios' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">BIOS Configuration</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search BIOS attributes..." className="pl-8 pr-3 py-1.5 border border-border-card rounded text-xs w-64 focus:ring-1 focus:ring-dell-blue" />
              </div>
              {Object.keys(editedAttrs).length > 0 && (
                <button onClick={handleSaveBios} disabled={saving} className="px-3 py-1.5 bg-dell-blue text-white text-xs font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50 flex items-center gap-1">
                  <Save className="w-3 h-3" /> {saving ? 'Saving...' : `Apply ${Object.keys(editedAttrs).length} Change(s)`}
                </button>
              )}
            </div>
          </div>
          {saveMsg && <div className="px-4 py-2 text-sm bg-amber-50 border-b border-amber-200 text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {saveMsg}</div>}
          {bios?.bootMode && <div className="px-4 py-2 text-xs text-text-secondary border-b border-border-card">Boot Mode: <span className="font-semibold uppercase">{bios.bootMode}</span></div>}
          <div className="divide-y divide-border-card">
            {Object.keys(filteredGroups).length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">No BIOS attributes available for this server</p>
            ) : Object.entries(filteredGroups).map(([group, attrs]) => (
              <div key={group}>
                <button onClick={() => toggleGroup(group)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-row-hover transition-colors">
                  {expandedGroups.has(group) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {group} <span className="text-xs text-text-secondary font-normal">({(attrs as any[]).length})</span>
                </button>
                {expandedGroups.has(group) && (
                  <div className="px-4 pb-2">
                    {(attrs as any[]).map((attr: any) => (
                      <div key={attr.name} className="flex items-center py-1.5 text-sm border-t border-border-card/50">
                        <span className="w-[45%] text-text-secondary truncate" title={attr.name}>{attr.name}</span>
                        <div className="w-[55%]">
                          {attr.readOnly ? (
                            <span className="font-mono text-xs">{attr.value}</span>
                          ) : (
                            <input
                              value={editedAttrs[attr.name] ?? attr.value ?? ''}
                              onChange={(e) => setEditedAttrs({ ...editedAttrs, [attr.name]: e.target.value })}
                              className={`w-full px-2 py-1 border rounded text-xs font-mono ${editedAttrs[attr.name] !== undefined ? 'border-dell-blue bg-blue-50/30' : 'border-border-card'}`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {bios?.pendingChanges?.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-1">Pending Changes (apply on next reboot):</p>
              {bios.pendingChanges.map((p: any) => (
                <div key={p.name} className="text-xs text-amber-600">{p.name}: {p.value}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Boot Order */}
      {tab === 'boot' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Boot Device Order</h2>
          </div>
          {bios?.bootOrder?.length > 0 ? (
            <div className="p-4 space-y-1">
              {bios.bootOrder.map((device: any, i: number) => (
                <div key={device.id} className={`flex items-center gap-3 px-4 py-2.5 rounded border ${device.enabled ? 'border-border-card bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                  <span className="text-xs font-bold text-text-secondary w-6">#{i + 1}</span>
                  <HardDrive className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium flex-1">{device.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${device.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {device.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-8">Boot order not available for this server generation</p>
          )}
        </div>
      )}

      {/* Hardware Inventory */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          {/* CPUs */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
              <Cpu className="w-4 h-4 text-dell-blue" />
              <h2 className="text-[13px] font-bold uppercase tracking-wide">Processors</h2>
            </div>
            {cpus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {cpus.map((cpu: any) => (
                  <div key={cpu.id} className="border border-border-card rounded p-4">
                    <h3 className="font-semibold text-sm mb-2">{cpu.socket}: {cpu.model}</h3>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries({ Manufacturer: cpu.manufacturer, Cores: cpu.cores, Threads: cpu.threads, 'Max Speed': `${cpu.maxSpeedMHz} MHz`, Architecture: cpu.architecture, Status: cpu.status }).map(([k, v]) => (
                        <div key={k}><span className="text-text-secondary">{k}:</span> <span className="font-medium capitalize">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-text-secondary text-center py-6">No processor data available</p>}
          </div>

          {/* Memory */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-dell-blue" />
              <h2 className="text-[13px] font-bold uppercase tracking-wide">Memory DIMMs</h2>
            </div>
            {memory.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="bg-row-alt"><th className="text-left p-3">Slot</th><th className="text-left p-3">Capacity</th><th className="text-left p-3">Speed</th><th className="text-left p-3">Type</th><th className="text-left p-3">Manufacturer</th><th className="text-left p-3">Status</th></tr></thead>
                <tbody>{memory.map((m: any) => (
                  <tr key={m.id} className="border-t border-border-card">
                    <td className="p-3 font-mono text-xs">{m.slot}</td>
                    <td className="p-3">{m.capacityGB} GB</td>
                    <td className="p-3">{m.speedMHz} MHz</td>
                    <td className="p-3">{m.type}</td>
                    <td className="p-3">{m.manufacturer}</td>
                    <td className="p-3 capitalize text-green-healthy">{m.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-text-secondary text-center py-6">No memory inventory available</p>}
          </div>

          {/* PCIe Devices */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
              <Monitor className="w-4 h-4 text-dell-blue" />
              <h2 className="text-[13px] font-bold uppercase tracking-wide">PCIe Devices</h2>
            </div>
            {pcie.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="bg-row-alt"><th className="text-left p-3">Name</th><th className="text-left p-3">Model</th><th className="text-left p-3">Manufacturer</th><th className="text-left p-3">Slot Type</th><th className="text-left p-3">Status</th></tr></thead>
                <tbody>{pcie.map((d: any) => (
                  <tr key={d.id} className="border-t border-border-card">
                    <td className="p-3">{d.name}</td>
                    <td className="p-3">{d.model}</td>
                    <td className="p-3">{d.manufacturer}</td>
                    <td className="p-3">{d.slotType}</td>
                    <td className="p-3 capitalize text-green-healthy">{d.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-text-secondary text-center py-6">No PCIe device data available</p>}
          </div>
        </div>
      )}
    </div>
  );
}
