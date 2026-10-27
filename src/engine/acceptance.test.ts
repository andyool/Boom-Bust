// SPEC section 11: the required acceptance tests.
import { describe, expect, it } from 'vitest';
import { freeJobs, netWorth, newsPreview } from './helpers';
import { netFor, settleUp } from './money';
import { apply, replay } from './reducer';
import { itemise, newTable, own, pset, set, stepLines, type Table } from './testkit';
import type { Action, Game } from './types';

const PAYDAY_STEPS = ['income', 'profit', 'projects', 'living', 'debts'];

/** Mia (p1, Kitchen Hand) owns the Bakery and the Gym, has 1 loan, and 1 project is built. */
function workedExample(economy: string): Table {
  return newTable(1).edit(own('bakery', 'p1'), own('gym', 'p1'), pset('p1', 'loans', 1), set('projectsBuilt', 1), set('economy', economy));
}

describe('SPEC 11 acceptance tests', () => {
  it('1. Worked example, Level 1', () => {
    const t = workedExample('SLOW').startPayday().do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    const lines = stepLines(t.payday.lines, ...PAYDAY_STEPS);
    expect(itemise(lines, 'p1')).toEqual([
      ['Wage', 90],
      ['Bakery', 20],
      ['Gym', 0],
      ['Projects', 10],
      ['Living', -70],
      ['Interest', -20],
    ]);
    expect(lines.find((l) => l.label === 'Tax')).toMatchObject({ from: 'bank', to: 'treasury', amount: 10 });
    expect(netFor(lines, 'p1')).toBe(30);
    expect(settleUp(lines)).toEqual([
      { from: 'bank', to: 'p1', amount: 30 },
      { from: 'bank', to: 'treasury', amount: 10 },
    ]);
    expect(netFor(lines, 'treasury')).toBe(10);
  });

  it('2. Same in RECESSION, looking for work (the News card pushes the economy down)', () => {
    const t = workedExample('SLOW').startPayday().do({ type: 'news', cardId: 'N10' });
    expect(t.g.economy).toBe('RECESSION');
    expect(t.g.players[0].jobStatus).toBe('looking'); // Entry job lost in the recession
    t.do({ type: 'paydaySettle' });
    const lines = stepLines(t.payday.lines, ...PAYDAY_STEPS);
    expect(itemise(lines, 'p1')).toEqual([
      ['JobSeeker', 50],
      ['Bakery', 10],
      ['Gym', -20],
      ['Projects', 10],
      ['Living', -70],
      ['Interest', -20],
    ]);
    expect(netFor(lines, 'p1')).toBe(-40);
    expect(settleUp(lines)).toEqual([
      { from: 'treasury', to: 'p1', amount: 50 },
      { from: 'p1', to: 'bank', amount: 90 },
    ]);
  });

  it('2b. Same, starting in RECESSION and already looking for work', () => {
    const t = workedExample('RECESSION').edit(pset('p1', 'jobStatus', 'looking')).startPayday();
    t.do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    const lines = stepLines(t.payday.lines, ...PAYDAY_STEPS);
    expect(netFor(lines, 'p1')).toBe(-40);
    expect(settleUp(lines)).toEqual([
      { from: 'treasury', to: 'p1', amount: 50 },
      { from: 'p1', to: 'bank', amount: 90 },
    ]);
  });

  it('3. Monopoly price', () => {
    const owns = [own('pizza_place', 'p2'), own('burger_bar', 'p2'), own('sushi_bar', 'p2')];
    const l1 = newTable(1).edit(...owns).rollTo(18).do({ type: 'payRent' });
    expect(l1.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'p2', amount: 60 })]);

    const l2 = newTable(2).edit(...owns, set('prices', 4)).rollTo(18).do({ type: 'payRent' });
    expect(l2.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'p2', amount: 70 })]);
  });

  it('4. Employer: shift pay', () => {
    const all = newTable(1)
      .edit(own('furniture_factory', 'p2'), own('boat_builder', 'p2'), own('solar_factory', 'p2'))
      .rollTo(32)
      .do({ type: 'payRent' });
    expect(all.g.last.transfers).toEqual([expect.objectContaining({ from: 'p2', to: 'p1', amount: 10, label: 'Shift pay' })]);

    const one = newTable(1).edit(own('boat_builder', 'p2')).rollTo(32).do({ type: 'payRent' });
    expect(one.g.last.transfers).toEqual([expect.objectContaining({ from: 'p2', to: 'p1', amount: 20 })]);
  });

  it('5. Transport', () => {
    const t = newTable(1)
      .edit(own('trucking', 'p2'), own('freight_railway', 'p2'), own('fremantle_port', 'p2'))
      .rollTo(25)
      .do({ type: 'payRent' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'p2', amount: 60 })]);
  });

  it('6. Rates soften a boom (L2)', () => {
    const t = newTable(2).edit(set('interest', 'HIGH'), set('economy', 'STEADY')).startPayday();
    const before = t.g;
    t.do({ type: 'news', cardId: 'N02' });
    expect(t.g.last.events).toContainEqual({ kind: 'economy', from: 'STEADY', to: 'STEADY', cardArrow: 1, arrow: 0 });
    expect(t.g.economy).toBe('STEADY');
    expect([t.g.prices, t.g.wages, t.g.interest]).toEqual([before.prices, before.wages, before.interest]);
    expect(t.g.last.transfers).toEqual([]);
    expect(t.g.players.map((p) => p.jobStatus)).toEqual(before.players.map((p) => p.jobStatus));
  });

  it('7. Into BOOM (L2)', () => {
    const t = newTable(2)
      .edit(set('economy', 'GROWTH'), set('interest', 'NORMAL'), set('prices', 2), own('iron_ore_mine', 'p3'), pset('p2', 'jobStatus', 'looking'))
      .startPayday()
      .do({ type: 'news', cardId: 'N01' });
    expect(t.g.economy).toBe('BOOM');
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'bank', to: 'p3', amount: 50 })]);
    expect(t.g.prices).toBe(3);
    expect(t.g.interest).toBe('HIGH');
    expect(t.g.wages).toBe(0);
    expect(t.g.players[1].jobStatus).toBe('employed');
  });

  it('8. Into RECESSION (L2)', () => {
    const t = newTable(2)
      .edit(set('economy', 'SLOW'), set('interest', 'LOW'), pset('p2', 'jobId', 'J07'))
      .startPayday();
    expect(newsPreview(t.g, 'N11')).toMatchObject({ arrow: -1, to: 'RECESSION' });
    expect(newsPreview(t.g, 'N11').atRisk.map((r) => [r.playerId, r.needsRoll])).toEqual([
      ['p1', false],
      ['p2', true],
      ['p3', false],
    ]);
    // Ben is Skilled, so he must roll.
    expect(() => apply(t.g, { type: 'news', cardId: 'N11' })).toThrow(/roll/);
    t.do({ type: 'news', cardId: 'N11', jobRisk: { p2: { roll: 5 } } });
    expect(t.g.economy).toBe('RECESSION');
    expect(t.g.players.map((p) => p.jobStatus)).toEqual(['looking', 'employed', 'looking']);
    expect(t.g.interest).toBe('LOW');
    expect(t.g.flags.noNewLoans).toBe(true);
  });

  it('9. Treasury build', () => {
    const t = newTable(1).edit(set('treasury', 395)).startPayday().do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(t.g.treasury).toBe(405);
    t.do({ type: 'paydayDone' });
    expect(t.g.projectsBuilt).toBe(1);
    expect(t.g.last.events).toContainEqual({ kind: 'project', projectId: 'PP1' });
    expect(t.g.treasury).toBe(105);
  });

  it('10. Treasury borrowing', () => {
    const t = newTable(1, 4).edit(set('treasury', 30)).startPayday().do({ type: 'news', cardId: 'N12' });
    const bonds = t.g.last.transfers.filter((l) => l.label === 'Bond');
    expect(bonds).toEqual([expect.objectContaining({ from: 'bank', to: 'treasury', amount: 200 })]);
    expect(netFor(t.g.last.transfers.filter((l) => l.label !== 'Bond'), 'treasury')).toBe(-200);
    expect(t.g.treasury).toBe(30);
    expect(t.g.bonds).toBe(1);
  });

  it('11. Net worth', () => {
    const t = newTable(1).edit(
      pset('p1', 'superBalance', 100),
      own('bakery', 'p1'),
      { target: 'holding', businessId: 'bakery', field: 'extraSites', value: 1 },
      { target: 'holding', businessId: 'bakery', field: 'sitesPaid', value: 50 },
      set('economy', 'BOOM'),
      pset('p1', 'loans', 1),
      pset('p1', 'hecs', true),
    );
    const worth = netWorth(t.g, 'p1', 500);
    expect(worth.lines.map((l) => l.amount)).toEqual([500, 0, 200, 225, -200, -100]);
    expect(worth.total).toBe(625);
  });

  it('12. Shop around (L3)', () => {
    const t = newTable(3).edit(
      own('pizza_place', 'p3'),
      { target: 'holding', businessId: 'pizza_place', field: 'priceClip', value: 'premium' },
      own('burger_bar', 'p2'),
      { target: 'holding', businessId: 'burger_bar', field: 'priceClip', value: 'budget' },
    );
    t.rollTo(16).do({ type: 'payRent' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'p2', amount: 20 })]);
  });

  it('13. TAFE', () => {
    const t = newTable(1);
    const treasury0 = t.g.treasury;
    t.fullPayday('N15', {}, [{ type: 'study', course: 'tafe' }]);
    const fee = t.g.lastPayday!.lines.filter((l) => l.step === 'choices');
    expect(fee).toEqual([expect.objectContaining({ from: 'p1', to: 'treasury', amount: 50 })]);
    expect(t.g.players[0].jobStatus).toBe('studying');
    expect(t.g.treasury).toBe(treasury0 + 10 + 50); // wage tax + fee

    t.nextUntil('p1').startPayday().do({ type: 'news', cardId: 'N15' });
    expect(() => apply(t.g, { type: 'paydaySettle' })).toThrow(/job card/);
    t.do({ type: 'paydaySettle', newJobId: 'J07' });
    expect(itemise(stepLines(t.payday.lines, 'income'), 'p1')).toEqual([['Study', 30]]);
    expect(t.payday.lines.find((l) => l.label === 'Study')).toMatchObject({ from: 'treasury' });
    const mia = t.g.players[0];
    expect([mia.jobId, mia.jobStatus, mia.study]).toEqual(['J07', 'employed', undefined]);
    expect(freeJobs(t.g, 'entry').map((j) => j.id)).toContain('J02');
    t.do({ type: 'paydayDone' });

    t.nextUntil('p1').startPayday().do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(itemise(stepLines(t.payday.lines, 'income'), 'p1')).toEqual([['Wage', 130]]);
  });

  it('14. Undo: dropping the last action and replaying gives the state before it', () => {
    const t = scriptedGame();
    const states: Game[] = [];
    let g = replay([]);
    for (const a of t.actions) {
      states.push(g);
      g = apply(deepFreeze(g), a); // apply must never mutate its input
    }
    expect(g).toEqual(t.g);
    for (let k = t.actions.length; k > 0; k--) {
      expect(replay(t.actions.slice(0, k - 1))).toEqual(states[k - 1]);
    }
  });
});

/** A game that touches most kinds of action. */
function scriptedGame(): Table {
  const t = newTable(2, 4);
  t.rollTo(6).do({ type: 'buy' }, { type: 'loan' }, { type: 'next' }); // Mia buys the Bakery
  t.rollTo(9).do({ type: 'pass' }, { type: 'next' }); // Ben passes the Corner Deli
  t.rollTo(6).do({ type: 'payRent' }, { type: 'next' }); // Ana pays Mia
  t.rollTo(2).do({ type: 'drawCard', cardId: 'L03' }, { type: 'savings', amount: 200 }, { type: 'next' });
  t.do({ type: 'roll', d1: 1, d2: 2 }); // Mia from 6 to 9: the Corner Deli Ben passed on
  t.do({ type: 'auction', winnerId: 'p3', bid: 80 }, { type: 'next' });
  t.rollTo(30).do({ type: 'jobCut' }, { type: 'next' }); // Ben loses his Entry job
  t.rollTo(0).do({ type: 'news', cardId: 'N03' }, { type: 'paydaySettle' }, { type: 'addSite', businessId: 'corner_deli' }, { type: 'paydayDone' });
  t.do({ type: 'next' });
  t.rollTo(20).do({ type: 'parliament', cardId: 'P11', passed: true }, { type: 'next' });
  t.rollTo(0).do({ type: 'news', cardId: 'N11' }, { type: 'paydaySettle' }, { type: 'paydayDone' });
  t.do({ type: 'sell', businessId: 'bakery' }, { type: 'next' });
  return t;
}

function deepFreeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) deepFreeze(v);
  }
  return x;
}

export type { Action };
