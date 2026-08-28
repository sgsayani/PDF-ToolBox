import { useCallback, useState } from 'react';

import type { WorkspaceTool } from '../types';

const STORAGE_KEY = 'pdftoolbox:recent-tools';
const MAX_RECENT = 5;

function read(): WorkspaceTool[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((entry) => typeof entry === 'string') as WorkspaceTool[]) : [];
  } catch {
    // Private browsing, disabled storage, or corrupted data — recent tools
    // just isn't available; never break navigation over it.
    return [];
  }
}

/**
 * Remembers which tools this browser has used recently, purely as a
 * navigation convenience — nothing here is sent to the server or shared
 * between devices.
 */
export function useRecentTools(): { recent: WorkspaceTool[]; recordUse: (tool: WorkspaceTool) => void } {
  const [recent, setRecent] = useState<WorkspaceTool[]>(read);

  const recordUse = useCallback((tool: WorkspaceTool) => {
    setRecent((current) => {
      const next = [tool, ...current.filter((entry) => entry !== tool)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — the in-memory state still updates for this session.
      }
      return next;
    });
  }, []);

  return { recent, recordUse };
}
