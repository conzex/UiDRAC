/** Product version history — major/minor lines and core implementation per release. */
'use client';

import Link from 'next/link';
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  kindLabel,
  publicMinorReleaseLines,
  PRODUCT_NAME,
  PRODUCT_PUBLISHER,
  publicProductReleases,
  VERSIONING_POLICY,
} from '@idrac/shared';
import { ChevronRight, Package } from 'lucide-react';
import PublicChrome from '@/components/layout/public-chrome';

export default function VersionsPage() {
  const lines = publicMinorReleaseLines();
  const milestones = publicProductReleases();

  return (
    <PublicChrome mainClassName="py-8 sm:py-10">
      <div className="max-w-3xl mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-dell-blue/10 text-dell-blue text-xs font-semibold mb-3">
          <Package className="w-3.5 h-3.5" /> Version manager
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">{PRODUCT_NAME} releases</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          A product of <strong className="text-text-primary">{PRODUCT_PUBLISHER}</strong>. Current build:{' '}
          <span className="font-mono text-dell-blue">{APP_VERSION_LABEL}</span> ({APP_VERSION}).
        </p>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {VERSIONING_POLICY} Patch builds update the running version ({APP_VERSION_LABEL}) but are not listed below—only
          major and minor milestones appear in this log.
        </p>
        <p className="text-sm mt-3">
          <Link href="/docs#getting-started" className="text-dell-blue font-semibold hover:underline inline-flex items-center gap-0.5">
            Documentation <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>

      <div className="space-y-4 mb-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">Release lines (milestones)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lines.map((line) => (
            <div key={line.line} className="bg-white border border-border-card rounded p-4">
              <div className="text-xs text-text-secondary uppercase tracking-wider">Line {line.line}.x</div>
              <div className="text-lg font-bold text-dell-blue tabular-nums mt-1">Latest v{line.latestVersion}</div>
              <div className="text-xs text-text-secondary mt-1">
                Milestone {kindLabel(line.latestKind).toLowerCase()} · line {line.line}.x
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">Major & minor release log</h2>
        {milestones.map((release) => {
          const [rMaj, rMin] = release.version.split('.').map((n) => parseInt(n, 10));
          const [aMaj, aMin] = APP_VERSION.split('.').map((n) => parseInt(n, 10));
          const isCurrentLine = rMaj === aMaj && rMin === aMin;
          const isExactCurrent = release.version === APP_VERSION;
          return (
            <article
              key={release.version}
              className={`bg-white border rounded overflow-hidden ${isExactCurrent ? 'border-dell-blue ring-1 ring-dell-blue/20' : 'border-border-card'}`}
            >
              <div className="bg-card-header px-4 py-3 border-b border-border-card flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-bold text-text-primary">v{release.version}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      release.kind === 'major'
                        ? 'bg-dell-blue text-white'
                        : release.kind === 'minor'
                          ? 'bg-dell-blue/15 text-dell-blue'
                          : 'bg-gray-100 text-text-secondary'
                    }`}
                  >
                    {kindLabel(release.kind)}
                  </span>
                  {isCurrentLine && !isExactCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-dell-blue/10 text-dell-blue">
                      Current line
                    </span>
                  )}
                  {isExactCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-50 text-green-healthy">
                      Current
                    </span>
                  )}
                </div>
                <time className="text-xs text-text-secondary tabular-nums" dateTime={release.released}>
                  {release.released}
                </time>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">{release.title}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">Core implementation</p>
                <ul className="space-y-2">
                  {release.coreImplementation.map((item) => (
                    <li key={item} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                      <span className="text-dell-blue shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </PublicChrome>
  );
}
