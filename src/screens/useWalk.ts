// Walks a token space by space (anticlockwise) after a roll, instead of jumping.
import { useEffect, useRef, useState } from 'react';
import { BOARD_SIZE, type Action, type Game } from '../engine';

const STEP_MS = 150;
const MAX_WALK = 12; // two dice

const positions = (g: Game) => Object.fromEntries(g.players.map((p) => [p.id, p.position]));

export function useWalk(game: Game, lastAction: Action | undefined) {
  const [shown, setShown] = useState<Record<string, number>>(() => positions(game));
  const [walking, setWalking] = useState(false);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const target = positions(game);
    const from = shownRef.current;
    const walks = lastAction?.type === 'roll' || lastAction?.type === 'paydayDone';
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mover = game.players.find((p) => from[p.id] !== undefined && from[p.id] !== target[p.id]);
    const steps = mover ? (target[mover.id] - from[mover.id] + BOARD_SIZE) % BOARD_SIZE : 0;

    if (!mover || !walks || reduced || steps > MAX_WALK) {
      setShown(target);
      setWalking(false);
      return;
    }
    // Everyone else snaps; the mover steps along the ring.
    let k = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    setWalking(true);
    setShown({ ...target, [mover.id]: from[mover.id] });
    const timer = setInterval(() => {
      k += 1;
      setShown((s) => ({ ...s, [mover.id]: (from[mover.id] + k) % BOARD_SIZE }));
      if (k >= steps) {
        clearInterval(timer);
        settle = setTimeout(() => setWalking(false), STEP_MS * 2);
      }
    }, STEP_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(settle);
      setShown(target);
      setWalking(false);
    };
  }, [game, lastAction]);

  return { shown, walking };
}
