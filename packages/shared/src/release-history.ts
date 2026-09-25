import catalog from './release-history.json';
import { APP_VERSION } from './version';

export type ReleaseKind = 'major' | 'minor' | 'patch';

export type ProductRelease = {
  version: string;
  released: string;
  kind: ReleaseKind;
  title: string;
  coreImplementation: string[];
};

export type MinorReleaseLine = {
  /** e.g. "1.2" */
  line: string;
  major: number;
  minor: number;
  releases: ProductRelease[];
  latestVersion: string;
  latestKind: ReleaseKind;
};

export const PRODUCT_PUBLISHER = catalog.publisher;
export const VERSIONING_POLICY = catalog.versioningPolicy;

export const PRODUCT_RELEASES: ProductRelease[] = catalog.releases as ProductRelease[];

function parseVersion(version: string): [number, number, number] {
  const [a, b, c] = version.split('.').map((n) => parseInt(n, 10));
  return [a || 0, b || 0, c || 0];
}

function compareSemverDesc(a: ProductRelease, b: ProductRelease): number {
  const va = parseVersion(a.version);
  const vb = parseVersion(b.version);
  for (let i = 0; i < 3; i++) {
    if (va[i] !== vb[i]) return vb[i] - va[i];
  }
  return 0;
}

/** All releases newest first. */
export function sortedProductReleases(): ProductRelease[] {
  return [...PRODUCT_RELEASES].sort(compareSemverDesc);
}

export function releaseByVersion(version: string): ProductRelease | undefined {
  return PRODUCT_RELEASES.find((r) => r.version === version);
}

export function currentProductRelease(): ProductRelease | undefined {
  return releaseByVersion(APP_VERSION);
}

/** Milestone releases shown on the version manager (major + minor only). */
export function publicProductReleases(): ProductRelease[] {
  return sortedProductReleases().filter((r) => r.kind === 'major' || r.kind === 'minor');
}

/** Minor lines derived from milestone releases only (for version manager summary cards). */
export function publicMinorReleaseLines(): MinorReleaseLine[] {
  const map = new Map<string, ProductRelease[]>();
  for (const r of publicProductReleases()) {
    const [major, minor] = parseVersion(r.version);
    const line = `${major}.${minor}`;
    const list = map.get(line) ?? [];
    list.push(r);
    map.set(line, list);
  }

  const lines: MinorReleaseLine[] = [];
  for (const [line, releases] of map.entries()) {
    const sorted = [...releases].sort(compareSemverDesc);
    const [major, minor] = parseVersion(sorted[0].version);
    lines.push({
      line,
      major,
      minor,
      releases: sorted,
      latestVersion: sorted[0].version,
      latestKind: sorted[0].kind,
    });
  }

  lines.sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major;
    return b.minor - a.minor;
  });
  return lines;
}

/** Group releases under minor lines (1.0.x, 1.1.x, 1.2.x) — full catalog including patches. */
export function minorReleaseLines(): MinorReleaseLine[] {
  const map = new Map<string, ProductRelease[]>();
  for (const r of PRODUCT_RELEASES) {
    const [major, minor] = parseVersion(r.version);
    const line = `${major}.${minor}`;
    const list = map.get(line) ?? [];
    list.push(r);
    map.set(line, list);
  }

  const lines: MinorReleaseLine[] = [];
  for (const [line, releases] of map.entries()) {
    const sorted = [...releases].sort(compareSemverDesc);
    const [major, minor] = parseVersion(sorted[0].version);
    lines.push({
      line,
      major,
      minor,
      releases: sorted,
      latestVersion: sorted[0].version,
      latestKind: sorted[0].kind,
    });
  }

  lines.sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major;
    return b.minor - a.minor;
  });
  return lines;
}

export function kindLabel(kind: ReleaseKind): string {
  if (kind === 'major') return 'Major';
  if (kind === 'minor') return 'Minor';
  return 'Patch';
}
