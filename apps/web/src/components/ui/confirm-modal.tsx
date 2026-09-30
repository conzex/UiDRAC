'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
};

const variantStyles = {
  danger: { icon: 'text-red-critical', iconBg: 'bg-red-50 border-red-200', btn: 'bg-red-critical hover:bg-red-700 text-white', IconComp: AlertTriangle },
  warning: { icon: 'text-amber-warning', iconBg: 'bg-amber-50 border-amber-200', btn: 'bg-amber-warning hover:bg-amber-700 text-white', IconComp: AlertTriangle },
  info: { icon: 'text-dell-blue', iconBg: 'bg-row-hover border-dell-blue/20', btn: 'bg-dell-blue hover:bg-dell-blue-hover text-white', IconComp: Info },
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.getElementById('app-modal-root'));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onCancel]);

  if (!open || !portalRoot) return null;

  const s = variantStyles[variant];
  const Icon = s.IconComp;

  const modal = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onCancel();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        className="bg-white border border-border-card rounded shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header — matches project card-header */}
        <div className="bg-card-header px-4 py-3 border-b border-border-card flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-gray-200/80 text-text-secondary shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded border shrink-0 ${s.iconBg}`}>
              <Icon className={`w-5 h-5 ${s.icon}`} />
            </div>
            <div className="text-sm text-text-secondary leading-relaxed">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          </div>
        </div>

        {/* Footer — matches project card-header */}
        <div className="flex justify-end gap-2 px-4 py-3 bg-card-header border-t border-border-card">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold border border-border-card rounded bg-white hover:bg-row-hover text-text-primary"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded ${s.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
