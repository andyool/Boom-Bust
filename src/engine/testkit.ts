// Helpers for engine tests: drive a game through real actions, as the UI would.
import { apply } from './reducer';
import { initialGame } from './reducer';
import type { Action, Edit, Game, Level, PaydayPhase, SetupPlayer, Transfer } from './types';

const ENTRY = ['J02', 'J01', 'J03', 'J04', 'J05', 'J06'];
const NAMES = ['Mia', 'Ben', 'Ana', 'Raj', 'Zoe', 'Kai'];

export class Table {
  g: Game = initialGame();
  actions: Action[] = [];

  do(...actions: Action[]): this {
    for (const a of actions) {
      this.g = apply(this.g, a);
      this.actions.push(a);
    }
    return this;
  }

  edit(...edits: Edit[]): this {
    return this.do({ type: 'edit', edits });
  }

  get payday(): PaydayPhase {
    if (this.g.phase.name !== 'payday') throw new Error(`Not in Payday (${this.g.phase.name})`);
    return this.g.phase;
  }

  /** The current player reports landing on `pos`, as the UI does. */
  landOn(pos: number): this {
    return this.do({ type: 'land', playerId: this.g.players[this.g.turnIndex].id, pos });
  }

  /** The current player reports passing PAYDAY and starts their Payday. */
  startPayday(): this {
    return this.do({ type: 'payday', playerId: this.g.players[this.g.turnIndex].id });
  }

  /** A whole Payday: News, settle, optional choices, DONE. */
  fullPayday(news = 'N15', settle: Omit<Extract<Action, { type: 'paydaySettle' }>, 'type'> = {}, choices: Action[] = []): this {
    return this.startPayday()
      .do({ type: 'news', cardId: news }, { type: 'paydaySettle', ...settle }, ...choices, { type: 'paydayDone' });
  }

  /** The current player visits JOB CENTRE and ends their turn. */
  skipTurn(): this {
    return this.do({ type: 'moveTo', pos: 10 }, { type: 'next' });
  }

  /** Ends the current turn, then skips everyone until it is `pid`'s turn again. */
  nextUntil(pid: string): this {
    this.do({ type: 'next' });
    while (this.g.players[this.g.turnIndex].id !== pid) this.skipTurn();
    return this;
  }
}

export function newTable(level: Level, n = 3, startingLife?: string[]): Table {
  const players: SetupPlayer[] = Array.from({ length: n }, (_, i) => ({
    name: NAMES[i],
    token: `T0${i + 1}`,
    jobId: ENTRY[i],
    startingLife: startingLife?.[i] ?? (level === 3 ? 'S06' : undefined),
  }));
  if (level === 3 && !startingLife) players.forEach((p, i) => (p.startingLife = ['S06', 'S06', 'S06', 'S02', 'S03', 'S05'][i]));
  return new Table().do({ type: 'setup', level, players });
}

/** [label, signed amount for this player] for each line that involves the player. */
export function itemise(lines: Transfer[], pid: string): [string, number][] {
  return lines.filter((l) => l.from === pid || l.to === pid).map((l) => [l.label, l.to === pid ? l.amount : -l.amount]);
}

export const stepLines = (lines: Transfer[], ...steps: string[]) => lines.filter((l) => steps.includes(l.step ?? ''));

export const own = (businessId: string, playerId: string | null): Edit => ({ target: 'holding', businessId, field: 'ownerId', value: playerId });
export const set = (field: Extract<Edit, { target: 'game' }>['field'], value: number | string): Edit => ({ target: 'game', field, value });
export const pset = (playerId: string, field: Extract<Edit, { target: 'player' }>['field'], value: number | string | boolean | string[]): Edit => ({
  target: 'player', playerId, field, value,
});
