/** Docs URL hash helpers — shareable /docs#section and /docs#section--block-slug links. */

export function slugifyDocHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function docsBlockAnchorId(sectionId: string, heading: string): string {
  return `${sectionId}--${slugifyDocHeading(heading)}`;
}

export function buildDocsHash(sectionId: string, blockSlug?: string): string {
  if (blockSlug) return `#${sectionId}--${blockSlug}`;
  return `#${sectionId}`;
}

export function buildDocsPath(sectionId: string, blockSlug?: string): string {
  return `/docs${buildDocsHash(sectionId, blockSlug)}`;
}

type DocSectionLike = { id: string; content: { heading: string }[] };

export function parseDocsHash(
  hash: string,
  sections: DocSectionLike[],
): { sectionId: string; blockSlug?: string } {
  const fallback = sections[0]?.id ?? 'getting-started';
  const raw = decodeURIComponent(hash.replace(/^#/, '')).trim();
  if (!raw) return { sectionId: fallback };

  if (raw.includes('--')) {
    const sep = raw.indexOf('--');
    const sectionId = raw.slice(0, sep);
    const blockSlug = raw.slice(sep + 2);
    if (sections.some((s) => s.id === sectionId)) {
      return { sectionId, blockSlug: blockSlug || undefined };
    }
  }

  const match = sections.find((s) => s.id === raw);
  if (match) return { sectionId: match.id };

  return { sectionId: fallback };
}

export function findBlockIndexBySlug(
  section: DocSectionLike,
  blockSlug: string | undefined,
): number | null {
  if (!blockSlug) return null;
  const idx = section.content.findIndex((c) => slugifyDocHeading(c.heading) === blockSlug);
  return idx >= 0 ? idx : null;
}

export function scrollToDocAnchor(anchorId: string, headerOffsetPx: number) {
  const el = document.getElementById(anchorId);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffsetPx - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}
