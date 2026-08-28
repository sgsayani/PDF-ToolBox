import { useCallback, useMemo, useRef, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface HistoryControls<T> {
  state: T;
  /** Applies an update and pushes the previous value onto the undo stack. */
  set: (updater: T | ((current: T) => T)) => void;
  /** Replaces the state and clears both stacks — used when the document changes. */
  reset: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Number of steps taken since the last reset. */
  revisions: number;
}

const HISTORY_LIMIT = 50;

/**
 * `useState` with undo/redo.
 *
 * Editing pages is easy to get wrong by accident — deleting the wrong page,
 * dropping a card in the wrong slot — so every change in the workspace is
 * reversible.
 */
export function useHistoryState<T>(initial: T | (() => T)): HistoryControls<T> {
  const [history, setHistory] = useState<HistoryState<T>>(() => ({
    past: [],
    present: typeof initial === 'function' ? (initial as () => T)() : initial,
    future: [],
  }));
  const revisions = useRef(0);

  const set = useCallback((updater: T | ((current: T) => T)) => {
    setHistory((current) => {
      const next =
        typeof updater === 'function' ? (updater as (value: T) => T)(current.present) : updater;

      if (Object.is(next, current.present)) return current;

      revisions.current += 1;
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const reset = useCallback((next: T) => {
    revisions.current = 0;
    setHistory({ past: [], present: next, future: [] });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (previous === undefined) return current;

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (next === undefined) return current;

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: rest,
      };
    });
  }, []);

  return useMemo(
    () => ({
      state: history.present,
      set,
      reset,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      revisions: history.past.length,
    }),
    [history, set, reset, undo, redo],
  );
}
