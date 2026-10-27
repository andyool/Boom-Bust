// The game timer (SPEC 5.2 step 4): seconds left, ticking once a second. Null when the game ends by Paydays.
import { useEffect, useState } from 'react';

export function useTimeLeft(startedAt: number | undefined, minutes: number | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  const on = !!startedAt && !!minutes;
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  if (!on) return null;
  return Math.max(0, Math.round((startedAt! + minutes! * 60_000 - now) / 1000));
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
