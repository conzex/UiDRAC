/** Storage page — Controllers, Physical Disks, Virtual Disks. */
'use client';
import { useParams } from 'next/navigation';
import { ServerTabPreloader } from '@/components/servers/server-tab-preloader';
import { ServerTabError } from '@/components/servers/server-tab-error';
import { useServerSummary } from '@/lib/use-server-summary';

export default function StoragePage() {
  const { id } = useParams() as { id: string };
  const { data, loading, error, reload } = useServerSummary<{ storage: any }>(
    id ? `/servers/${id}/summary/storage` : null,
  );

  const storage = data?.storage;

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white border border-border-card rounded">
      <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
        <h2 className="text-[13px] font-bold uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );

  const EmptyRow = ({ text }: { text: string }) => (
    <p className="text-sm text-text-secondary text-center py-6">{text}</p>
  );

  if (loading) return <ServerTabPreloader tab="storage" />;
  if (error && !storage) return <ServerTabError message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{error}</div>
      )}
      <Card title="RAID Controllers">
        {storage?.controllers?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Model</th>
                <th className="text-left p-3">Firmware</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {storage.controllers.map((c: any) => (
                <tr key={c.id} className="border-t border-border-card">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.model}</td>
                  <td className="p-3">{c.firmwareVersion}</td>
                  <td className="p-3 text-green-healthy capitalize">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyRow text="No RAID controllers detected" />
        )}
      </Card>
      <Card title="Physical Disks">
        {storage?.physicalDisks?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Model</th>
                <th className="text-left p-3">Capacity</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {storage.physicalDisks.map((d: any) => (
                <tr key={d.id} className="border-t border-border-card">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.model}</td>
                  <td className="p-3">{d.capacityGB} GB</td>
                  <td className="p-3">{d.mediaType}</td>
                  <td className="p-3 text-green-healthy capitalize">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyRow text="No physical disks detected" />
        )}
      </Card>
      <Card title="Virtual Disks">
        {storage?.virtualDisks?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">RAID Level</th>
                <th className="text-left p-3">Capacity</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {storage.virtualDisks.map((v: any) => (
                <tr key={v.id} className="border-t border-border-card">
                  <td className="p-3">{v.name}</td>
                  <td className="p-3">{v.raidLevel}</td>
                  <td className="p-3">{v.capacityGB} GB</td>
                  <td className="p-3 text-green-healthy capitalize">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyRow text="No virtual disks configured" />
        )}
      </Card>
    </div>
  );
}
