'use client';

import { Search } from 'lucide-react';

export function ServerSearchEmpty() {
  return (
    <div className="text-center py-16 text-text-secondary">
      <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
      <p className="text-lg mb-2 text-text-primary">No servers match your search</p>
      <p className="text-sm">Try adjusting your search query</p>
    </div>
  );
}
