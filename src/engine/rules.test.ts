// Broader rules coverage beyond SPEC 11: every card, laws, Level 3, DECISIONS.md.
import { describe, expect, it } from 'vitest';
import { C, DATA } from './data';
import { availableCards, canBorrow, chargeFor, landingNote, loanLimit, rentQuote, sellValue, studyOptions } from './helpers';
import { netFor, notesFor } from './money';
import { apply } from './reducer';
import { itemise, newTable, own, pset, set, stepLines, Table } from './testkit';
import type { Action, Edit } from './types';

const clip = (businessId: string, value: string): Edit => ({ target: 'holding', businessId, field: 'priceClip', value });
const law = (cardId: string): Edit => ({ target: 'law', cardId, on: true });
const fork = (t: Table) => Object.assign(new Table(), { g: t.g, actions: [...t.actions] });

/** A Level 2 table where everyone owns a spread of businesses. */
function richTable(level: 1 | 2 | 3 = 2) {
  return newTable(level, 4).edit(
    ...['iron_ore_mine', 'lithium_mine', 'furniture_factory', 'trucking'].map((b) => own(b, 'p1')),
    ...['plumber', 'gym', 'bakery', 'pizza_place', 'coffee_cart'].map((b) => own(b, 'p2')),
    ...['clothing_store', 'supermarket'].map((b) => own(b, 'p3')),
    pset('p2', 'jobId', 'J08'),
    pset('p1', 'superBalance', 30),
    pset('p2', 'superBalance', 80),
  );
}

describe('note helper', () => {
  it('uses the fewest notes', () => {
    expect(notesFor(90)).toEqual([{ note: 50, count: 1 }, { note: 20, count: 2 }]);
    expect(notesFor(60)).toEqual([{ note: 50, count: 1 }, { note: 10, count: 1 }]);
    expect(notesFor(680)).toEqual([{ note: 500, count: 1 }, { note: 100, count: 1 }, { note: 50, count: 1 }, { note: 20, count: 1 }, { note: 10, count: 1 }]);
    expect(notesFor(0)).toEqual([]);
    expect(() => notesFor(175)).toThrow();
  });
});

describe('halves round up to the next $10 (DECISIONS.md)', () => {
  it('selling to the Bank', () => {
    const t = newTable(1).edit(own('lithium_mine', 'p1'));
    expect(sellValue(t.g, 'lithium_mine')).toBe(180);
    t.do({ type: 'sell', businessId: 'lithium_mine' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'bank', to: 'p1', amount: 180 })]);
    expect(t.g.holdings.lithium_mine.ownerId).toBeNull();
  });
  it('M12 half-price Extra Site and M14 bargain', () => {
    const m12 = newTable(1).edit(own('coffee_cart', 'p1')).landOn(22).do({ type: 'drawCard', cardId: 'M12', businessId: 'coffee_cart' });
    expect(m12.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'bank', amount: 20 })]);
    expect(m12.g.holdings.coffee_cart).toMatchObject({ extraSites: 1, sitesPaid: 20 });

    const m14 = newTable(1).landOn(22).do({ type: 'drawCard', cardId: 'M14', businessId: 'lithium_mine' });
    expect(m14.g.last.transfers).toEqual([expect.objectContaining({ from: 'p1', to: 'bank', amount: 180 })]);
    expect(m14.g.holdings.lithium_mine.ownerId).toBe('p1');
  });
});

describe('every card resolves', () => {
  const rolls = { p1: { roll: 4 }, p2: { roll: 4 }, p3: { roll: 4 }, p4: { roll: 4 } };
  for (const level of [1, 2, 3] as const) {
    it(`all 24 News cards at Level ${level}`, () => {
      const base = richTable(level);
      for (const card of DATA.cards.news) {
        const t = fork(base).startPayday().do({ type: 'news', cardId: card.id, jobRisk: rolls }, { type: 'paydaySettle' }, { type: 'paydayDone' });
        expect(t.g.record.at(-1)!.newsCard).toBe(card.id);
      }
    });
  }
  it('all Life and Market cards', () => {
    const base = richTable(2);
    const inputs: Record<string, Partial<Extract<Action, { type: 'drawCard' }>>> = {
      L09: { answer: true }, L19: { answer: true }, M12: { businessId: 'iron_ore_mine' }, M14: { businessId: 'butcher' }, M15: { otherId: 'p2' },
    };
    for (const card of [...DATA.cards.life, ...DATA.cards.market]) {
      const t = fork(base).landOn(card.deck === 'life' ? 2 : 22).do({ type: 'drawCard', cardId: card.id, ...inputs[card.id] });
      expect(t.g.phase.name).toBe('after');
    }
  });
  it('some card results', () => {
    const base = richTable(2);
    const draw = (cardId: string, extra = {}) => fork(base).landOn(2).do({ type: 'drawCard', cardId, ...extra }).g.last.transfers;
    expect(netFor(draw('L03'), 'p1')).toBe(30); // three others pay $10
    expect(draw('L06')).toEqual([expect.objectContaining({ from: 'p1', amount: 50 })]); // Mia is Entry
    expect(draw('L09', { answer: false })).toEqual([]);
    const market = (cardId: string) => fork(base).landOn(22).do({ type: 'drawCard', cardId }).g.last.transfers;
    expect(netFor(market('M06'), 'p3')).toBe(-30); // Clothing Store only
    expect(netFor(market('M06'), 'p1')).toBe(20); // one transport
    expect(netFor(market('M07'), 'treasury')).toBe(3 * 40); // 3 factories + mines, all Mia's
    expect(netFor(fork(base).edit(law('P15')).landOn(22).do({ type: 'drawCard', cardId: 'M07' }).g.last.transfers, 'treasury')).toBe(3 * 20);
  });
  it('M15 needs a partner who owns a business; nothing if nobody does', () => {
    const t = newTable(1).landOn(22);
    expect(t.do({ type: 'drawCard', cardId: 'M15' }).g.last.transfers).toEqual([]);
    const u = richTable(1).landOn(22);
    expect(() => apply(u.g, { type: 'drawCard', cardId: 'M15' })).toThrow(/player/);
    expect(() => apply(u.g, { type: 'drawCard', cardId: 'M15', otherId: 'p4' })).toThrow(/owns no business/);
  });
  it('N14 takes up to $50 of each Super', () => {
    const t = richTable(1).startPayday().do({ type: 'news', cardId: 'N14' });
    expect(t.g.players.map((p) => p.superBalance)).toEqual([0, 30, 0, 0]);
  });
  it('N22 pays employed Skilled workers first, then rehires', () => {
    const t = richTable(1).edit(pset('p3', 'jobId', 'J09'), pset('p3', 'jobStatus', 'looking')).startPayday().do({ type: 'news', cardId: 'N22' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ to: 'p2', amount: 30 })]);
    expect(t.g.players[2].jobStatus).toBe('employed');
  });
  it('M16 fines every complete industry; Level 3 forces Standard until the owner\'s Payday', () => {
    const t = newTable(3).edit(own('pizza_place', 'p2'), own('burger_bar', 'p2'), own('sushi_bar', 'p2'), clip('pizza_place', 'monopoly'));
    t.landOn(22).do({ type: 'drawCard', cardId: 'M16' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'p2', to: 'treasury', amount: 100 })]);
    expect(chargeFor(t.g, t.g.holdings.pizza_place).clip).toBe('standard');
    t.nextUntil('p2').startPayday().do({ type: 'news', cardId: 'N15' });
    expect(chargeFor(t.g, t.g.holdings.pizza_place).clip).toBe('monopoly');
  });
});

describe('laws (Level 2)', () => {
  it('a 4th law needs one removed; latest law wins', () => {
    const t = newTable(2).edit(law('P03'), law('P04'), law('P07'));
    expect(() => apply(t.g, { type: 'budgetNight', cardId: 'P08' })).toThrow(/remove/);
    t.do({ type: 'budgetNight', cardId: 'P08', removeLawId: 'P07' });
    expect(t.g.laws.map((l) => l.id)).toEqual(['P03', 'P04', 'P08']);
    t.edit(own('bakery', 'p1'), own('gym', 'p1')).landOn(4).do({ type: 'taxTime' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ to: 'treasury', amount: 2 * 10, qty: 2, each: 10 })]); // P04 is later
  });
  it('JobSeeker follows the latest of P07 and P08', () => {
    const t = newTable(2).edit(law('P08'), law('P07'), pset('p1', 'jobStatus', 'looking')).startPayday();
    t.do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(itemise(stepLines(t.payday.lines, 'income'), 'p1')).toEqual([['JobSeeker', 70]]);
  });
  it('P13 is -$10 at Level 2 and Budget only at Level 3 (DECISIONS.md)', () => {
    const l2 = newTable(2).edit(own('bakery', 'p2'), own('supermarket', 'p2'), law('P13'));
    expect(chargeFor(l2.g, l2.g.holdings.bakery).amount).toBe(10);
    expect(chargeFor(l2.g, l2.g.holdings.supermarket).amount).toBe(30);
    const l3 = newTable(3).edit(own('bakery', 'p2'), own('supermarket', 'p2'), clip('bakery', 'premium'), law('P13'));
    expect(chargeFor(l3.g, l3.g.holdings.bakery)).toEqual({ amount: 10, clip: 'budget' });
    expect(chargeFor(l3.g, l3.g.holdings.supermarket).amount).toBe(30);
  });
  it('P10 auctions the utilities; owners collect bills and profit; selling returns them to government', () => {
    const t = newTable(2).landOn(20).do({
      type: 'parliament', cardId: 'P10', passed: true,
      auctions: [{ businessId: 'power_company', winnerId: 'p2', bid: 150 }, { businessId: 'water_company', winnerId: null, bid: 0 }],
    });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'p2', to: 'treasury', amount: 150 })]);
    expect(t.g.holdings.power_company).toMatchObject({ ownerId: 'p2', price: 150 });
    expect(rentQuote(t.g, 12, 'p1')).toMatchObject({ payee: 'p2', amount: 20 });
    expect(rentQuote(t.g, 28, 'p1')).toMatchObject({ payee: 'treasury', amount: 20 });
    t.edit({ target: 'law', cardId: 'P10', on: false });
    expect(t.g.holdings.power_company.ownerId).toBe('p2'); // stays sold
    expect(sellValue(t.g, 'power_company')).toBe(80); // half of 150, rounded up
    t.do({ type: 'sell', businessId: 'power_company' });
    expect(rentQuote(t.g, 12, 'p1')).toMatchObject({ payee: 'treasury' });
  });
  it('P11 sends $10 GST to Treasury; P12 and P16 change living costs', () => {
    const t = newTable(2).edit(law('P11'), law('P12'), own('boat_builder', 'p1')).startPayday();
    t.do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(itemise(stepLines(t.payday.lines, 'living'), 'p1')).toEqual([['Living', -80], ['GST', -10]]);
    expect(itemise(stepLines(t.payday.lines, 'profit'), 'p1')).toEqual([['Boat Builder', 50], ['Law', 20]]);
  });
  it('P14 asks about cash unless Savings alone are over $1,000', () => {
    const t = newTable(2).edit(law('P14')).startPayday().do({ type: 'news', cardId: 'N15' });
    expect(() => apply(t.g, { type: 'paydaySettle' })).toThrow(/cash/);
    expect(netFor(apply(t.g, { type: 'paydaySettle', fortune: true }).last.transfers.filter((l) => l.label === 'Fortune tax'), 'treasury')).toBe(50);
    const rich = newTable(2).edit(law('P14'), pset('p1', 'savings', 1200)).startPayday().do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(rich.payday.lines.some((l) => l.label === 'Fortune tax')).toBe(true);
  });
  it('Savings interest is paid in cash (DECISIONS.md)', () => {
    const t = newTable(2).do({ type: 'savings', amount: 400 }).startPayday().do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(t.payday.lines.find((l) => l.label === 'Savings' && l.step === 'debts')).toMatchObject({ from: 'bank', to: 'p1', amount: 20 });
    expect(t.g.players[0].savings).toBe(400);
  });
  it('Treasury pays Bond interest at the Start Player\'s Payday and repays Bonds before building', () => {
    // $900 + $10 wage tax - $20 interest = $890, repay both Bonds ($690, $490), then build ($190).
    const t = newTable(2).edit(set('bonds', 2), set('treasury', 900)).fullPayday();
    const tr = t.g.lastPayday!.lines.filter((l) => l.step === 'treasury');
    expect(tr.map((l) => [l.label, l.amount])).toEqual([['Bond interest', 20], ['Repay Bond', 200], ['Repay Bond', 200], ['Project', 300]]);
    expect([t.g.bonds, t.g.projectsBuilt, t.g.treasury]).toEqual([0, 1, 190]);
    // Not the Start Player: no Bond interest.
    const u = newTable(2).edit(set('bonds', 1), set('treasury', 100)).skipTurn().fullPayday();
    expect(u.g.lastPayday!.lines.filter((l) => l.step === 'treasury')).toEqual([]);
  });
});

describe('Level 3 shopping around', () => {
  it('the lander picks between two other cheapest owners', () => {
    const t = newTable(3, 4).edit(own('pizza_place', 'p2'), own('burger_bar', 'p3'), own('sushi_bar', 'p4'), clip('pizza_place', 'premium'));
    t.landOn(16);
    expect(rentQuote(t.g, 16, 'p1').choices).toEqual(['p3', 'p4']);
    expect(() => apply(t.g, { type: 'payRent' })).toThrow(/Pick/);
    t.do({ type: 'payRent', payeeId: 'p4' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ to: 'p4', amount: 30 })]);
  });
  it('pays nothing if the cheapest is the lander\'s own', () => {
    const t = newTable(3).edit(own('pizza_place', 'p2'), own('burger_bar', 'p1'), clip('burger_bar', 'budget')).landOn(16).do({ type: 'payRent' });
    expect(t.g.last.transfers).toEqual([]);
    expect(t.g.last.events).toContainEqual({ kind: 'cheapestIsYours', playerId: 'p1', businessId: 'burger_bar' });
  });
  it('Supply Deals pay $20 at Payday and end when a business is sold', () => {
    const t = newTable(3).edit(own('bakery', 'p1'), own('pizza_place', 'p2'), own('gym', 'p3'));
    expect(() => apply(t.g, { type: 'deal', a: 'p1', aBiz: 'bakery', b: 'p3', bBiz: 'gym' })).toThrow(/linked/);
    t.do({ type: 'deal', a: 'p1', aBiz: 'bakery', b: 'p2', bBiz: 'pizza_place' }).startPayday();
    t.do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' });
    expect(t.payday.lines).toContainEqual(expect.objectContaining({ label: 'Supply Deal', to: 'p1', amount: 20 }));
    t.do({ type: 'sell', businessId: 'pizza_place' });
    expect(t.g.supplyDeals).toEqual([]);
  });
});

describe('Starting Life (Level 3)', () => {
  it('start cash and S04 Coffee Cart', () => {
    const t = newTable(3, 3, ['S01', 'S04', 'S02']);
    expect(itemise(t.g.last.transfers, 'p1')).toEqual([['Start', 700]]);
    expect(itemise(t.g.last.transfers, 'p2')).toEqual([['Start', 300]]);
    expect(t.g.holdings.coffee_cart.ownerId).toBe('p2');
    expect(t.g.last.transfers[0]).toMatchObject({ from: 'bank', to: 'treasury', amount: C.treasuryStart });
  });
  it('S01 is kept when the first course is already free, then used (DECISIONS.md)', () => {
    const t = newTable(3, 3, ['S01', 'S06', 'S06']).landOn(7).do({ type: 'openDay', course: 'uni' });
    expect(t.g.players[0]).toMatchObject({ hecs: false, freeCourseUsed: false, jobStatus: 'studying' });
    const fresh = newTable(3, 3, ['S01', 'S06', 'S06']);
    expect(studyOptions(fresh.g, 'p1', false).uni).toMatchObject({ hecs: false, freeBy: 'family' });
    fresh.fullPayday('N15', {}, [{ type: 'study', course: 'uni' }]);
    expect(fresh.g.players[0]).toMatchObject({ hecs: false, freeCourseUsed: true });
  });
  it('S03 pays $100 for TAFE; S05 takes home $20 less', () => {
    const t = newTable(3, 3, ['S03', 'S05', 'S06']);
    expect(studyOptions(t.g, 'p1', false).tafe.fee).toBe(100);
    t.do({ type: 'moveTo', pos: 10 }, { type: 'next' }).fullPayday();
    expect(itemise(stepLines(t.g.lastPayday!.lines, 'income'), 'p2')).toEqual([['Wage', 70]]);
  });
});

describe('jobs, study and loans', () => {
  it('doubles while looking for work gets the job back before moving', () => {
    const t = newTable(1).edit(pset('p1', 'jobStatus', 'looking')).do({ type: 'roll', d1: 2, d2: 2 });
    expect(t.g.players[0].jobStatus).toBe('employed');
    expect(t.g.last.events[0]).toEqual({ kind: 'gotJob', playerId: 'p1', why: 'doubles' });
  });
  it('JOB CUT: lost job moves to JOB CENTRE without Payday; L12 can save it', () => {
    const t = newTable(1).landOn(30).do({ type: 'jobCut' });
    expect([t.g.players[0].jobStatus, t.g.players[0].position, t.g.phase.name]).toEqual(['looking', 10, 'after']);
    const v = newTable(1).edit(pset('p1', 'keepCards', ['L12'])).landOn(30).do({ type: 'jobCut', volunteer: true });
    expect([v.g.players[0].jobStatus, v.g.players[0].keepCards]).toEqual(['employed', []]);
    const skilled = newTable(1).edit(pset('p1', 'jobId', 'J07')).landOn(30);
    expect(skilled.do({ type: 'jobCut', roll: 4 }).g.players[0].jobStatus).toBe('employed');
  });
  it('L19 insurance cancels the next Car Crash', () => {
    const t = newTable(1).landOn(2).do({ type: 'drawCard', cardId: 'L19', answer: true });
    expect(availableCards(t.g, 'life')).not.toContain('L19');
    t.do({ type: 'next' }).skipTurn().skipTurn().landOn(17).do({ type: 'drawCard', cardId: 'L20' });
    expect(t.g.last.transfers).toEqual([]);
    expect(t.g.players[0].keepCards).toEqual([]);
  });
  it('loan limit: 1 per business + 1 if employed; blocked by noNewLoans and Bankrupt', () => {
    const t = newTable(1).edit(own('bakery', 'p1'));
    expect(loanLimit(t.g, 'p1')).toBe(2);
    t.do({ type: 'loan' }, { type: 'loan' });
    expect(canBorrow(t.g, 'p1')).toEqual({ ok: false, why: 'limit' });
    expect(() => apply(t.g, { type: 'loan' })).toThrow(/limit/);
    t.do({ type: 'repay' });
    expect(t.g.players[0].loans).toBe(1);
  });
  it('bankruptcy: businesses back to the Bank, loans cancelled, 3 tokens that drop at each Payday', () => {
    const t = newTable(2).edit(own('bakery', 'p1'), pset('p1', 'loans', 2)).do({ type: 'savings', amount: 200 }, { type: 'bankrupt', playerId: 'p1' });
    expect(t.g.last.transfers).toEqual([expect.objectContaining({ from: 'savings:p1', to: 'p1', amount: 200 })]);
    expect(t.g.players[0]).toMatchObject({ loans: 0, savings: 0, bankruptTokens: 3 });
    expect(t.g.holdings.bakery.ownerId).toBeNull();
    expect(canBorrow(t.g, 'p1').why).toBe('bankrupt');
    t.fullPayday();
    expect(t.g.players[0].bankruptTokens).toBe(2);
  });
  it('Super Fund: Bank adds $50 if employed; anyone may add up to $100', () => {
    const t = newTable(1).landOn(38).do({ type: 'superFund', own: 30 });
    expect(t.g.players[0].superBalance).toBe(80);
    const l = newTable(1).edit(pset('p1', 'jobStatus', 'looking')).landOn(38).do({ type: 'superFund', own: 100 });
    expect(l.g.players[0].superBalance).toBe(100);
  });
});

describe('reporting what happened (no dice entry)', () => {
  it('any player can report a landing, in any order; it acts for them', () => {
    const t = newTable(1).do({ type: 'land', playerId: 'p3', pos: 6 }, { type: 'buy' });
    expect(t.g.holdings.bakery.ownerId).toBe('p3');
    expect(t.g.phase.name).toBe('after');
    t.do({ type: 'land', playerId: 'p1', pos: 6 }, { type: 'payRent' });
    expect(itemise(t.g.last.transfers, 'p1')).toEqual([['Standard', -20]]);
  });
  it('Payday reported on its own finishes with nothing open', () => {
    const t = newTable(1).do({ type: 'land', playerId: 'p2', pos: 9 }, { type: 'pass' }, { type: 'payday', playerId: 'p2' });
    expect(t.payday.playerId).toBe('p2');
    t.do({ type: 'news', cardId: 'N15' }, { type: 'paydaySettle' }, { type: 'paydayDone' });
    expect([t.g.phase.name, t.g.players[1].paydays]).toEqual(['after', 1]);
  });
  it('nothing new can start while a landing or Payday is open', () => {
    const t = newTable(1).do({ type: 'payday', playerId: 'p1' });
    expect(() => apply(t.g, { type: 'land', playerId: 'p2', pos: 6 })).toThrow(/Not allowed/);
    expect(() => apply(newTable(1).landOn(6).g, { type: 'payday', playerId: 'p2' })).toThrow(/Not allowed/);
  });
  it('quiet spaces finish straight away', () => {
    const t = newTable(1).edit(own('bakery', 'p1'));
    for (const pos of [6, 10, 20]) {
      t.do({ type: 'land', playerId: 'p1', pos });
      expect(t.g.phase.name).toBe('after');
    }
    expect(landingNote(t.g, t.g.players[0], 6)).toBe('yours');
    expect(landingNote(t.g, t.g.players[1], 6)).toBeUndefined();
  });
  it('doubles get the job back only for players looking for work', () => {
    const t = newTable(1).edit(pset('p2', 'jobStatus', 'looking')).do({ type: 'doubles', playerId: 'p2' });
    expect(t.g.players[1].jobStatus).toBe('employed');
    expect(t.g.last.events).toEqual([{ kind: 'gotJob', playerId: 'p2', why: 'doubles' }]);
    expect(() => apply(t.g, { type: 'doubles', playerId: 'p2' })).toThrow(/looking for work/);
  });
});

describe('end of game', () => {
  it('ends when the round completes after the Start Player\'s 5th Payday', () => {
    const t = newTable(1);
    for (let i = 0; i < 4; i++) t.fullPayday().nextUntil('p1');
    t.fullPayday();
    expect(t.g.flags.lastRound).toBe(true);
    t.do({ type: 'next' }).skipTurn();
    expect(t.g.phase.name).toBe('turn');
    t.skipTurn();
    expect(t.g.phase.name).toBe('over');
    t.do({ type: 'finalCash', playerId: 'p1', cash: 420 });
    expect(t.g.finalCash.p1).toBe(420);
  });
});
