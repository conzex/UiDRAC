'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type AddServerModalContextValue = {
  open: boolean;
  openAddServer: () => void;
  closeAddServer: () => void;
};

const AddServerModalContext = createContext<AddServerModalContextValue | null>(null);

export function AddServerModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openAddServer = useCallback(() => setOpen(true), []);
  const closeAddServer = useCallback(() => setOpen(false), []);

  return (
    <AddServerModalContext.Provider value={{ open, openAddServer, closeAddServer }}>
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
