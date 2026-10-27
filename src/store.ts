// The game store: the action log is the saved game. Every action autosaves; Undo drops the last one.
import { useSyncExternalStore } from 'react';
import { apply, initialGame, tryApply, type Action, type Game } from './engine';

const KEY = 'boom-bust:game:v1';

interface Saved {
  actions: Action[];
  startedAt?: number; // wall-clock start, for the timer ending
}

export interface Snapshot {
  game: Game;
  actions: Action[];
  startedAt?: number;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    // Private mode or corrupt data: start empty.
  }
  return { actions: [] };
}

function save(s: Saved) {
  try {
    if (s.actions.length) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage full or blocked: the game keeps running in memory.
  }
}

/** Replays a saved log, keeping the longest prefix that is still valid. */
function rebuild(actions: Action[]): { game: Game; actions: Action[] } {
  let game = initialGame();
  const kept: Action[] = [];
  for (const a of actions) {
    const r = tryApply(game, a);
    if (!r.ok) break;
    game = r.game;
    kept.push(a);
  }
  return { game, actions: kept };
}

const saved = load();
let snap: Snapshot = { ...rebuild(saved.actions), startedAt: saved.startedAt };
const listeners = new Set<() => void>();

function set(next: Snapshot) {
  snap = next;
  save({ actions: next.actions, startedAt: next.startedAt });
  listeners.forEach((l) => l());
}

export const store = {
  get: () => snap,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Applies an action. Returns an error message if the rules do not allow it. */
  dispatch(action: Action): string | null {
    const r = tryApply(snap.game, action);
    if (!r.ok) return r.error;
    set({ ...snap, game: r.game, actions: [...snap.actions, action] });
    return null;
  },
  /** Tries an action without keeping it (for previews). */
  preview(action: Action, game: Game = snap.game): Game | null {
    const r = tryApply(game, action);
    return r.ok ? r.game : null;
  },
  undo(steps = 1) {
    if (!snap.actions.length) return;
    const actions = snap.actions.slice(0, Math.max(0, snap.actions.length - steps));
    const game = actions.reduce(apply, initialGame());
    set({ game, actions, startedAt: actions.length ? snap.startedAt : undefined });
  },
  newGame(setup: Extract<Action, { type: 'setup' }>): string | null {
    const r = tryApply(initialGame(), setup);
    if (!r.ok) return r.error;
    set({ game: r.game, actions: [setup], startedAt: Date.now() });
    return null;
  },
  clear() {
    set({ game: initialGame(), actions: [] });
  },
};

export function useStore(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.get);
}

export const useGame = () => useStore().game;
