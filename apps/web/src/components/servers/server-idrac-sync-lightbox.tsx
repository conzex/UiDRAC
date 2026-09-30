'use client';

type Props = {
  percent: number;
  stepLabel: string;
};

export function ServerIdracSyncLightbox({ percent, stepLabel }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-bg-body/80 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idrac-sync-title"
      aria-busy="true"
    >
      <div className="w-full max-w-md bg-white border border-border-card rounded-lg shadow-xl p-6">
        <h2 id="idrac-sync-title" className="text-base font-bold text-text-primary mb-1">
          Sync from iDRAC
        </h2>
        <p className="text-sm text-text-secondary mb-4 min-h-[1.25rem]">{stepLabel}</p>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden" aria-hidden>
          <div
            className="h-full bg-dell-blue transition-[width] duration-300 ease-out rounded-full"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="mt-4 text-center text-sm font-semibold text-text-primary tabular-nums">
          Loading… {clamped}%
        </p>
        <p className="mt-2 text-center text-xs text-text-secondary">
          Keep this tab open. All server sections refresh when sync completes.
        </p>
      </div>
    </div>
  );
}
