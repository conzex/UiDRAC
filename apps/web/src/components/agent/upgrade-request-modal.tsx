'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Send, CheckCircle } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  currentAgents: number;
  maxAgents: number;
  currentServers: number;
  maxServers: number;
};

const PRICING = [
  { sites: 1, servers: 3, price: 'Free', label: 'Starter' },
  { sites: 2, servers: 10, price: '$4.99/mo', label: 'Pro' },
  { sites: 5, servers: 25, price: '$12.99/mo', label: 'Business' },
  { sites: 'Unlimited', servers: 'Unlimited', price: 'Contact us', label: 'Enterprise' },
];

const AGENT_ADDON_PRICE = '$1.99/mo per additional agent';

export default function UpgradeRequestModal({ open, onClose, currentAgents, maxAgents, currentServers, maxServers }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setPortalRoot(document.getElementById('app-modal-root'));
  }, []);

  useEffect(() => {
    if (!open) { setSent(false); setReason(''); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || !portalRoot) return null;

  const handleSend = () => {
    setSent(true);
  };

  const modal = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="bg-white border border-border-card rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="bg-card-header px-5 py-3 border-b border-border-card flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Upgrade plan</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Current: {currentAgents}/{maxAgents} agents · {currentServers}/{maxServers} servers
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-gray-200 text-text-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-primary">Request sent!</h3>
            <p className="text-sm text-text-secondary mt-2">
              Our support team will review your request and get back to you within 24 hours.
            </p>
            <button type="button" onClick={onClose} className="mt-4 px-6 py-2 bg-dell-blue text-white text-sm font-semibold rounded">
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Pricing table */}
            <div className="overflow-hidden rounded border border-border-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card-header text-left text-[11px] uppercase text-text-secondary">
                    <th className="px-3 py-2 font-semibold">Plan</th>
                    <th className="px-3 py-2 font-semibold text-center">Sites</th>
                    <th className="px-3 py-2 font-semibold text-center">Servers</th>
                    <th className="px-3 py-2 font-semibold text-right">Monthly price</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING.map((p, i) => (
                    <tr key={p.label} className={`border-t border-border-card ${i === 0 ? 'bg-green-50/50' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-text-primary">
                        {p.label}
                        {i === 0 && <span className="ml-1.5 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">{p.sites}</td>
                      <td className="px-3 py-2.5 text-center">{p.servers}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-dell-blue">{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded text-sm">
              <Plus className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-900">
                Additional agents beyond your plan: <strong>{AGENT_ADDON_PRICE}</strong>
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Message to support (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. We need 3 additional agents for our remote data centers…"
                className="w-full mt-1 px-3 py-2 text-sm border border-border-card rounded resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold border border-border-card rounded hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 text-sm font-semibold bg-dell-blue text-white rounded hover:bg-dell-blue-hover inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Send upgrade request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
