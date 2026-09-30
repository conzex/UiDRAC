/** Power & thermal — dedicated tab (faster than loading full maintenance). */
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Power, Wind } from 'lucide-react';
import api from '@/lib/api';
import { ServerTabPreloader } from '@/components/servers/server-tab-preloader';
import { ServerTabError } from '@/components/servers/server-tab-error';
import { useServerSummary } from '@/lib/use-server-summary';

export default function PowerPage() {
  const { id } = useParams() as { id: string };
  const { data, loading, error, reload } = useServerSummary<{
    system: any;
    powerReadings: any;
    thermal: any;
  }>(id ? `/servers/${id}/summary/power` : null);

  const [powerMsg, setPowerMsg] = useState('');
  const [powerCapInput, setPowerCapInput] = useState('');

  const powerReadings = data?.powerReadings;
  const thermal = data?.thermal;
  const powerState = data?.system?.powerState;

  const handlePower = async (action: string) => {
    setPowerMsg('');
    try {
      await api.post(`/servers/${id}/power`, { action });
      setPowerMsg(`Power action "${action}" sent successfully.`);
    } catch (err: any) {
      setPowerMsg(err?.response?.data?.message || `Failed: "${action}".`);
    }
  };

  const handlePowerCap = async () => {
    try {
      const watts = powerCapInput === '' ? null : parseInt(powerCapInput, 10);
      await api.patch(`/servers/${id}/power/cap`, { watts });
      setPowerMsg(watts ? `Power cap set to ${watts}W.` : 'Power cap removed.');
      reload();
    } catch (err: any) {
      setPowerMsg(err?.response?.data?.message || 'Failed to set power cap.');
    }
  };

  if (loading) return <ServerTabPreloader tab="power" />;
  if (error && !powerReadings && !thermal) {
    return <ServerTabError message={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{error}</div>
      )}

      <div className="bg-white border border-border-card rounded p-4 flex items-center gap-3">
        <Power className="w-5 h-5 text-dell-blue" />
        <span className="text-sm text-text-secondary">System power state:</span>
        <span className="text-sm font-semibold capitalize">{powerState || 'unknown'}</span>
      </div>

      {powerReadings ? (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Power Consumption</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
            <div className="flex flex-wrap items-center gap-3 border-t border-border-card pt-4">
              <span className="text-sm text-text-secondary">Power Cap:</span>
              <span className="text-sm font-medium">
                {powerReadings.powerCapEnabled ? `${powerReadings.powerCap}W` : 'Disabled'}
              </span>
              <input
                value={powerCapInput}
                onChange={(e) => setPowerCapInput(e.target.value)}
                placeholder="Watts"
                className="px-2 py-1 border border-border-card rounded text-sm w-24"
              />
              <button
                type="button"
                onClick={() => void handlePowerCap()}
                className="px-3 py-1 bg-dell-blue text-white text-xs rounded hover:bg-dell-blue-hover"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary text-center py-6 bg-white border border-border-card rounded">
          Power readings not available yet.
        </p>
      )}

      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
          <h2 className="text-[13px] font-bold uppercase tracking-wide">Power Control</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-3 flex-wrap">
            {[
              { action: 'on', label: 'Power On', color: 'bg-green-600 hover:bg-green-700' },
              { action: 'graceful-shutdown', label: 'Graceful Shutdown', color: 'bg-amber-500 hover:bg-amber-600' },
              { action: 'reset', label: 'Reset', color: 'bg-dell-blue hover:bg-dell-blue-hover' },
              { action: 'cycle', label: 'Power Cycle', color: 'bg-orange-500 hover:bg-orange-600' },
              { action: 'nmi', label: 'NMI', color: 'bg-red-600 hover:bg-red-700' },
            ].map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={() => void handlePower(btn.action)}
                className={`px-4 py-2 ${btn.color} text-white text-sm rounded font-medium`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {powerMsg && <p className="text-sm mt-3 text-text-secondary">{powerMsg}</p>}
        </div>
      </div>

      {thermal && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center gap-2">
            <Wind className="w-4 h-4 text-dell-blue" />
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Thermal</h2>
          </div>
          <div className="p-4 text-sm text-text-secondary">
            {thermal.fans?.length ? `${thermal.fans.length} fan(s) reported` : 'Thermal data loaded'}
          </div>
        </div>
      )}
    </div>
  );
}
