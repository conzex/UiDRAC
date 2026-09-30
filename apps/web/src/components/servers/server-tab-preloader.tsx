'use client';

import AppPreloader from '@/components/layout/app-preloader';

const LABELS: Record<string, string> = {
  dashboard: 'Loading dashboard…',
  system: 'Loading system information…',
  storage: 'Loading storage…',
  configuration: 'Loading configuration…',
  maintenance: 'Loading maintenance…',
  idrac: 'Loading iDRAC settings…',
  console: 'Preparing virtual console…',
  power: 'Loading power & thermal…',
};

type Props = {
  tab?: string;
  label?: string;
};

export function ServerTabPreloader({ tab, label }: Props) {
  const text = label ?? (tab ? LABELS[tab] : undefined) ?? 'Loading server data…';
  return (
    <div className="bg-white border border-border-card rounded min-h-[320px] flex items-center justify-center">
      <AppPreloader fullScreen={false} label={text} />
    </div>
  );
}
