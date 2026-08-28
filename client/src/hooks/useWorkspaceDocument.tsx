import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { pdfApi } from '../services/pdfApi';
import type { WorkspaceDocument } from '../types';

interface WorkspaceDocumentContextValue {
  document: WorkspaceDocument | null;
  /** Opens a document, releasing whatever was open before. */
  open: (next: WorkspaceDocument) => void;
  /** Closes the workspace and asks the server to drop the working file. */
  close: () => void;
}

const WorkspaceDocumentContext = createContext<WorkspaceDocumentContextValue | null>(null);

/**
 * Holds the document currently open in the workspace.
 *
 * It lives above the router so the landing page can upload a file and hand it
 * straight to the workspace without a second round trip, and so a result can
 * be re-opened for further editing.
 */
export function WorkspaceDocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<WorkspaceDocument | null>(null);

  const open = useCallback((next: WorkspaceDocument) => {
    setDocument((previous) => {
      if (previous && previous.fileId !== next.fileId) void pdfApi.release(previous.fileId);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setDocument((previous) => {
      if (previous) void pdfApi.release(previous.fileId);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ document, open, close }), [document, open, close]);

  return (
    <WorkspaceDocumentContext.Provider value={value}>{children}</WorkspaceDocumentContext.Provider>
  );
}

export function useWorkspaceDocument(): WorkspaceDocumentContextValue {
  const context = useContext(WorkspaceDocumentContext);
  if (!context) {
    throw new Error('useWorkspaceDocument must be used inside a WorkspaceDocumentProvider');
  }
  return context;
}
