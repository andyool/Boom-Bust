import { C } from './data';
import type { Party, Transfer } from './types';

const SMALLEST_NOTE = Math.min(...C.notes);

/** Rounds up to the next amount the paper notes can make (DECISIONS.md: halves round up). */
export function roundUpToNote(amount: number): number {
  return Math.ceil(amount / SMALLEST_NOTE) * SMALLEST_NOTE;
}

/** Half of an amount, rounded up to a payable amount. */
export function half(amount: number): number {
  return roundUpToNote(amount * C.sellToBankFraction);
}

/** The fewest paper notes that make `amount`, largest first: [{ note, count }]. */
export function notesFor(amount: number): { note: number; count: number }[] {
  if (amount <= 0) return [];
  const notes = [...C.notes].sort((a, b) => b - a);
  const units = Math.round(amount / SMALLEST_NOTE);
  if (units * SMALLEST_NOTE !== amount) throw new Error(`$${amount} cannot be made from notes`);
  // Dynamic programming over multiples of the smallest note; ties prefer larger notes.
  const best: number[] = [0];
  const pick: number[] = [0];
  for (let u = 1; u <= units; u++) {
    best[u] = Infinity;
    for (const n of notes) {
      const k = n / SMALLEST_NOTE;
      if (k <= u && best[u - k] + 1 < best[u]) {
        best[u] = best[u - k] + 1;
        pick[u] = n;
      }
    }
  }
  const counts = new Map<number, number>();
  for (let u = units; u > 0; u -= pick[u] / SMALLEST_NOTE) counts.set(pick[u], (counts.get(pick[u]) ?? 0) + 1);
  return notes.filter((n) => counts.has(n)).map((note) => ({ note, count: counts.get(note)! }));
}

/** Net money a party gains (+) or loses (-) across transfers. */
export function netFor(transfers: Transfer[], party: Party): number {
  let net = 0;
  for (const t of transfers) {
    if (t.to === party) net += t.amount;
    if (t.from === party) net -= t.amount;
  }
  return net;
}

export interface Arrow {
  from: Party;
  to: Party;
  amount: number;
}

/** Nets transfers into one arrow per pair of parties (SPEC section 8). */
export function settleUp(transfers: Transfer[]): Arrow[] {
  const pairs = new Map<string, { a: Party; b: Party; net: number; order: number }>();
  transfers.forEach((t, i) => {
    if (t.amount === 0 || t.from === t.to) return;
    const [a, b] = t.from < t.to ? [t.from, t.to] : [t.to, t.from];
    const key = `${a}\u0000${b}`;
    const entry = pairs.get(key) ?? { a, b, net: 0, order: i };
    entry.net += t.from === a ? t.amount : -t.amount; // + means a pays b
    pairs.set(key, entry);
  });
  return [...pairs.values()]
    .filter((p) => p.net !== 0)
    .sort((x, y) => x.order - y.order)
    .map((p) => (p.net > 0 ? { from: p.a, to: p.b, amount: p.net } : { from: p.b, to: p.a, amount: -p.net }));
}
