// Words shown in the UI. Game numbers never live here; they come from game-data.json.
import { C } from '../engine';

/** Token names from the art manifest (Proofed game assets/manifest.json). */
export const TOKEN_NAME: Record<string, string> = {
  T01: 'Hard hat',
  T02: 'Coffee cup',
  T03: 'Laptop',
  T04: 'Surfboard',
  T05: 'Skateboard',
  T06: 'Seedling',
};
export const TOKENS = Object.keys(TOKEN_NAME);

export const LEVEL_NAME: Record<1 | 2 | 3, string> = {
  1: 'Starter',
  2: 'Money & Government',
  3: 'Competition & Fairness',
};

/** Banknote artwork for each note value: Q01 is the smallest note. */
export const NOTE_ART: Record<number, string> = Object.fromEntries(
  [...C.notes].sort((a, b) => a - b).map((n, i) => [n, `Q0${i + 1}`]),
);
