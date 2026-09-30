'use client';

import { useMemo } from 'react';

const PALETTE = ['#0076CE', '#22C55E', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#8B5CF6', '#64748B'];

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white border border-border-card rounded flex flex-col min-h-[220px] ${className}`}>
      <div className="px-4 py-3 border-b border-border-card">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{title}</h2>
        {subtitle && <p className="text-[11px] text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center">{children}</div>
    </section>
  );
}

export function HorizontalBarChart({
  items,
}: {
  items: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item, idx) => (
        <li key={item.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">{item.label}</span>
            <span className="font-semibold text-text-primary tabular-nums">{item.value}</span>
          </div>
          <div className="h-2.5 bg-bg-body rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? PALETTE[idx % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LineReachChart({
  history,
}: {
  history: { t: number; fleetMs: number; consoleMs: number | null }[];
}) {
  const w = 400;
  const h = 140;
  const pad = 8;

  const { fleetPath, consolePath, maxY } = useMemo(() => {
    if (history.length < 2) return { fleetPath: '', consolePath: '', maxY: 100 };
    const ys = history.flatMap((p) => [p.fleetMs, p.consoleMs ?? 0]);
    const maxY = Math.max(50, ...ys);
    const minT = history[0].t;
    const maxT = history[history.length - 1].t || minT + 1;
    const x = (t: number) => pad + ((t - minT) / (maxT - minT)) * (w - pad * 2);
    const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2);

    const fleetPath = history
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.fleetMs).toFixed(1)}`)
      .join(' ');

    const consolePts = history.filter((p) => p.consoleMs != null);
    const consolePath =
      consolePts.length >= 2
        ? consolePts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.consoleMs!).toFixed(1)}`)
            .join(' ')
        : '';

    return { fleetPath, consolePath, maxY };
  }, [history]);

  if (history.length < 2) {
    return <p className="text-xs text-text-secondary text-center">Collecting samples…</p>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]" aria-hidden>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E2E8F0" strokeWidth="1" />
        <path d={fleetPath} fill="none" stroke="#0076CE" strokeWidth="2" />
        {consolePath && <path d={consolePath} fill="none" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 3" />}
      </svg>
      <div className="flex gap-4 text-[10px] text-text-secondary mt-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-dell-blue inline-block" /> Fleet API ({maxY}ms max)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-green-healthy inline-block border-dashed" /> Console gateway
        </span>
      </div>
    </div>
  );
}

export function PieChartWithLegend({
  slices,
}: {
  slices: { label: string; value: number; color?: string }[];
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const filtered = slices.filter((s) => s.value > 0);

  if (total === 0) {
    return <p className="text-xs text-text-secondary text-center">No data yet</p>;
  }

  let angle = -Math.PI / 2;
  const r = 52;
  const cx = 64;
  const cy = 64;
  const paths: { d: string; color: string }[] = [];

  filtered.forEach((slice, idx) => {
    const frac = slice.value / total;
    const a1 = angle;
    const a2 = angle + frac * Math.PI * 2;
    angle = a2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const large = frac > 0.5 ? 1 : 0;
    const color = slice.color ?? PALETTE[idx % PALETTE.length];
    paths.push({
      color,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
    });
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 128 128" className="w-32 h-32 shrink-0">
        {paths.map((p) => (
          <path key={p.d.slice(0, 12)} d={p.d} fill={p.color} />
        ))}
        <circle cx={cx} cy={cy} r={28} fill="white" />
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-text-primary text-[11px] font-bold">
          {total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-text-secondary text-[8px]">
          total
        </text>
      </svg>
      <ul className="flex-1 space-y-1.5 text-xs min-w-0">
        {filtered.map((s, idx) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: s.color ?? PALETTE[idx % PALETTE.length] }}
            />
            <span className="text-text-secondary truncate flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function topModelSlices(byModel: Record<string, number>, limit = 8) {
  const entries = Object.entries(byModel).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, limit);
  const rest = entries.slice(limit).reduce((s, [, v]) => s + v, 0);
  const slices = top.map(([label, value]) => ({ label, value }));
  if (rest > 0) slices.push({ label: 'Other models', value: rest });
  return slices;
}
