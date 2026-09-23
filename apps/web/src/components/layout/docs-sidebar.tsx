'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocsSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

type DocsSidebarProps = {
  sections: DocsSection[];
  filteredSections: DocsSection[];
  activeSection: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSectionChange: (id: string) => void;
  /** 52px public header, 92px authenticated app shell */
  headerOffsetPx: number;
};

export default function DocsSidebar({
  sections,
  filteredSections,
  activeSection,
  search,
  onSearchChange,
  onSectionChange,
  headerOffsetPx,
}: DocsSidebarProps) {
  const stickyStyle = {
    top: `${headerOffsetPx}px`,
    maxHeight: `calc(100vh - ${headerOffsetPx}px - 1.5rem)`,
  } as React.CSSProperties;

  return (
    <>
      <aside
        className={cn(
          'hidden lg:block w-full lg:w-64 xl:w-72 bg-white border-b lg:border-b-0 lg:border-r border-border-card shrink-0',
          'lg:sticky lg:self-start z-10 overflow-y-auto overscroll-contain',
        )}
        style={stickyStyle}
        aria-label="Documentation sections"
      >
        <div className="p-4 border-b border-border-card">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search docs..."
              className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-1 focus:ring-dell-blue"
            />
          </div>
        </div>
        <nav className="p-2 space-y-0.5">
          {filteredSections.map((s, i) => {
            const isActive = activeSection === s.id;
            const num = String(i + 1).padStart(2, '0');
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSectionChange(s.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded flex items-center gap-3 transition-colors',
                  isActive ? 'bg-dell-blue/10 text-dell-blue' : 'text-text-secondary hover:text-text-primary hover:bg-row-hover',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? 'bg-dell-blue text-white' : 'bg-gray-100 text-text-secondary',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={cn('text-[10px] uppercase tracking-wider', isActive ? 'text-dell-blue/60' : 'text-text-secondary/50')}>
                    {num}
                  </div>
                  <div className={cn('text-sm truncate', isActive ? 'font-semibold' : 'font-medium')}>{s.title}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="lg:hidden w-full bg-white border-b border-border-card shrink-0">
        <select
          value={activeSection}
          onChange={(e) => onSectionChange(e.target.value)}
          className="w-full px-3 py-2 border border-border-card rounded text-sm"
          aria-label="Jump to documentation section"
        >
          {sections.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
