'use client';

import { Search } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** Fleet search — shared by Dashboard and Servers list. */
export function ServerSearchInput({ value, onChange, className = '' }: Props) {
  return (
    <div className={`mb-4 relative w-full ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or IP address..."
        className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue"
        aria-label="Search servers by name or IP address"
      />
    </div>
  );
}
