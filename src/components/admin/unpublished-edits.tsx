'use client';

import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';

// Workbench continues to guard links and beforeunload. This bridge lets the
// shell's sign-out form consult the same state without guarding publish forms.
const UnpublishedEdits = createContext<{ current: boolean } | null>(null);
export function UnpublishedEditsProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(false);
  return <UnpublishedEdits.Provider value={dirty}>{children}</UnpublishedEdits.Provider>;
}
export function useUnpublishedEdits(dirty: boolean) {
  const stateRef = useContext(UnpublishedEdits);
  useLayoutEffect(() => {
    if (!stateRef) return;
    stateRef.current = dirty;
    return () => {
      stateRef.current = false;
    };
  }, [dirty, stateRef]);
}
export function useConfirmSignOut() {
  const dirty = useContext(UnpublishedEdits);
  return () => !dirty?.current || window.confirm('Leave without publishing your changes?');
}
