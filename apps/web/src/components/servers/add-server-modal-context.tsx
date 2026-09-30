'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type AddServerModalContextValue = {
  open: boolean;
  openAddServer: () => void;
  closeAddServer: () => void;
  bulkOpen: boolean;
  openBulkImport: () => void;
  closeBulkImport: () => void;
};

const AddServerModalContext = createContext<AddServerModalContextValue | null>(null);

export function AddServerModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const openAddServer = useCallback(() => setOpen(true), []);
  const closeAddServer = useCallback(() => setOpen(false), []);
  const openBulkImport = useCallback(() => setBulkOpen(true), []);
  const closeBulkImport = useCallback(() => setBulkOpen(false), []);

  return (
    <AddServerModalContext.Provider
      value={{ open, openAddServer, closeAddServer, bulkOpen, openBulkImport, closeBulkImport }}
    >
      {children}
    </AddServerModalContext.Provider>
  );
}

export function useAddServerModal() {
  const ctx = useContext(AddServerModalContext);
  if (!ctx) throw new Error('useAddServerModal must be used within AddServerModalProvider');
  return ctx;
}

/** Safe hook for components that may render outside provider (returns no-op). */
export function useAddServerModalOptional() {
  return useContext(AddServerModalContext);
}
