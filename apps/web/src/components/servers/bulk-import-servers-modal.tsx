'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/app-modal';
import api from '@/lib/api';
import { CLOUD_SAAS_PRODUCT } from '@idrac/shared';
import {
  BULK_IMPORT_SAMPLE_CSV,
  downloadSampleCsv,
  parseBulkServerCsv,
  type BulkServerRow,
} from '@/lib/csv-server-import';
import { useAddServerModal } from './add-server-modal-context';
import { CheckCircle, XCircle, Loader2, Download, Upload } from 'lucide-react';

type RowState = BulkServerRow & {
  status: 'pending' | 'probing' | 'adding' | 'done' | 'failed';
  message?: string;
  serverId?: string;
};

export function BulkImportServersModal() {
  const router = useRouter();
  const { bulkOpen, closeBulkImport } = useAddServerModal();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [credMode, setCredMode] = useState(CLOUD_SAAS_PRODUCT ? 'saved' : 'session');
  const [running, setRunning] = useState(false);

  const reset = () => {
    setStep(1);
    setCsvText('');
    setParseErrors([]);
    setRows([]);
    setCredMode(CLOUD_SAAS_PRODUCT ? 'saved' : 'session');
    setRunning(false);
  };

  const handleClose = () => {
    if (running) return;
    closeBulkImport();
    reset();
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const goReview = () => {
    const { rows: parsed, errors } = parseBulkServerCsv(csvText);
    setParseErrors(errors);
    if (parsed.length === 0) return;
    setRows(parsed.map((r) => ({ ...r, status: 'pending' as const })));
    setStep(2);
  };

  const runImport = async () => {
    setRunning(true);
    setStep(3);
    const working = [...rows];

    for (let i = 0; i < working.length; i++) {
      const row = working[i];
      working[i] = { ...row, status: 'probing', message: 'Authenticating with iDRAC…' };
      setRows([...working]);

      try {
        const { data: probe } = await api.post('/servers/probe', {
          ip: row.host,
          username: row.username,
          password: row.password,
        });
        const name =
          row.name.trim() ||
          (probe.model ? `${probe.model}-${row.host.split('.').pop()}` : `Server-${row.host}`);
        working[i] = { ...working[i], status: 'adding', message: 'Registering server…' };
        setRows([...working]);

        const { data: created } = await api.post('/servers', {
          name,
          ip: row.host,
          username: row.username,
          password: row.password,
          credentialsMode: credMode,
        });
        working[i] = {
          ...working[i],
          status: 'done',
          message: `Added as ${name}`,
          serverId: created.id,
        };
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { message?: string } } };
        working[i] = {
          ...working[i],
          status: 'failed',
          message: ax.response?.data?.message || 'Probe or registration failed',
        };
      }
      setRows([...working]);
    }

    setRunning(false);
  };

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const failCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <AppModal
      open={bulkOpen}
      onClose={handleClose}
      title="Bulk import servers"
      subtitle={
        step === 1
          ? 'Upload CSV — host/IP, username, password (name optional)'
          : step === 2
            ? `Review ${rows.length} server(s) before import`
            : 'Importing one server at a time…'
      }
      maxWidthClass="max-w-3xl"
      maxHeightClass="max-h-[90vh]"
      bodyScroll
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border-card rounded bg-white hover:bg-row-hover"
            >
              <Download className="w-4 h-4" /> Download sample CSV
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-dell-blue text-dell-blue rounded cursor-pointer hover:bg-dell-blue/5">
              <Upload className="w-4 h-4" /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={BULK_IMPORT_SAMPLE_CSV.trim()}
            rows={10}
            className="w-full font-mono text-xs border border-border-card rounded p-3"
          />
          {parseErrors.length > 0 && (
            <ul className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 list-disc list-inside">
              {parseErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={!csvText.trim()}
            onClick={goReview}
            className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold text-sm disabled:opacity-50"
          >
            Next — review rows
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto border border-border-card rounded text-xs">
            <table className="w-full">
              <thead className="bg-row-alt sticky top-0">
                <tr>
                  <th className="p-2 text-left">Host</th>
                  <th className="p-2 text-left">User</th>
                  <th className="p-2 text-left">Name</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-t border-border-card">
                    <td className="p-2 font-mono">{r.host}</td>
                    <td className="p-2">{r.username}</td>
                    <td className="p-2 text-text-secondary">{r.name || '(auto)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase">Credential storage</label>
            <select
              value={credMode}
              onChange={(e) => setCredMode(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border-card rounded"
            >
              <option value="saved">Save encrypted (recommended)</option>
              <option value="session">Session only</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2 border border-border-card rounded text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void runImport()}
              className="flex-1 py-2 bg-dell-blue text-white rounded text-sm font-semibold"
            >
              Start import
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <span className="text-green-700 font-semibold">{doneCount} added</span>
            <span className="text-red-600 font-semibold">{failCount} failed</span>
            <span className="text-text-secondary">{rows.length - doneCount - failCount} remaining</span>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {rows.map((r) => (
              <li
                key={r.line}
                className="flex items-start gap-2 text-xs border border-border-card rounded px-3 py-2"
              >
                {r.status === 'probing' || r.status === 'adding' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-dell-blue shrink-0" />
                ) : r.status === 'done' ? (
                  <CheckCircle className="w-4 h-4 text-green-healthy shrink-0" />
                ) : r.status === 'failed' ? (
                  <XCircle className="w-4 h-4 text-red-critical shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-mono font-medium">{r.host}</div>
                  <div className="text-text-secondary">{r.message ?? r.status}</div>
                </div>
              </li>
            ))}
          </ul>
          {!running && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                router.push('/servers');
                router.refresh();
              }}
              className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold text-sm"
            >
              {doneCount > 0 ? 'View servers' : 'Close'}
            </button>
          )}
        </div>
      )}
    </AppModal>
  );
}
