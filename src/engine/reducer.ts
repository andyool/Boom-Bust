// The game is reduce(initialGame(), actions). Nothing here is random: dice and cards are physical.
import {
  ACTION_CARD, BOARD_SIZE, BUSINESS, C, DATA, ECON, INDUSTRY, JOB, NEWS, POLICY, RATES, SPACES, STARTING,
  type Econ, type Rate,
} from './data';
import { Ctx } from './ctx';
import {
  FREE_COURSE_CARD, availableCards, canAddSite, canBorrow, currentPlayer, econIndex, employed, fail,
  freeJobs, getPlayer, lawInForce, lawParam, lawsInOrder, linked, livingCost, owned, ownsAll, rentQuote,
  sellValue, studyOptions, RuleError,
} from './helpers';
import { jobRisk, runOps, type OpInputs } from './ops';
import type { Action, AuctionResult, Edit, Game, Holding, PaydayPhase, Player } from './types';

export function initialGame(): Game {
  const holdings: Record<string, Holding> = {};
  for (const b of DATA.businesses)
    holdings[b.id] = { businessId: b.id, ownerId: null, extraSites: 0, sitesPaid: 0, priceClip: 'standard' };
  return {
    level: 1,
    players: [],
    startPlayerId: '',
    turnIndex: 0,
    economy: C.economyStart,
    prices: DATA.tracks.prices.start,
    wages: DATA.tracks.wages.start,
    interest: DATA.tracks.interest.start,
    treasury: 0,
    bonds: 0,
    projectsBuilt: 0,
    holdings,
    laws: [],
    supplyDeals: [],
    flags: { noNewLoans: false, rbaMode: false, lastRound: false },
    record: [],
    settings: { noteHelper: true, endPaydays: C.endGamePaydays },
    phase: { name: 'setup' },
    seq: 0,
    finalCash: {},
    last: { transfers: [], events: [] },
  };
}

/** Applies one action and returns a new game. Throws RuleError if the action is not allowed. */
export function apply(game: Game, action: Action): Game {
  const g = structuredClone(game);
  const ctx = new Ctx(g);
  const before = g.phase;
  handle(ctx, action);
  if (before.name === 'payday') {
    before.lines.push(...ctx.transfers);
    before.events.push(...ctx.events);
    if (g.phase !== before)
      g.lastPayday = { playerId: before.playerId, newsCard: before.newsCard, lines: before.lines, events: before.events };
  }
  g.last = { transfers: ctx.transfers, events: ctx.events };
  return g;
}

export function replay(actions: Action[]): Game {
  return actions.reduce(apply, initialGame());
}

/** Checks an action without keeping the result. */
export function tryApply(game: Game, action: Action): { ok: true; game: Game } | { ok: false; error: string } {
  try {
    return { ok: true, game: apply(game, action) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------

const JOB_CENTRE = SPACES.find((s) => s.kind === 'job_centre')!.pos;

function phaseIs<N extends Game['phase']['name']>(g: Game, ...names: N[]) {
  if (!names.includes(g.phase.name as N)) fail(`Not allowed now (${g.phase.name})`);
}

function payday(g: Game, step?: PaydayPhase['step']): PaydayPhase {
  if (g.phase.name !== 'payday' || (step && g.phase.step !== step)) fail(`Not allowed now (${g.phase.name})`);
  return g.phase as PaydayPhase;
}

function landing(g: Game, ...kinds: string[]) {
  if (g.phase.name !== 'land') fail(`Not allowed now (${g.phase.name})`);
  const pos = (g.phase as { pos: number }).pos;
  const space = SPACES[pos];
  if (!kinds.includes(space.kind)) fail(`Wrong space for this (${space.kind})`);
  return space;
}

const sidePlayer = (g: Game, id?: string) => (id ? getPlayer(g, id) : currentPlayer(g));
const notOver = (g: Game) => {
  if (g.phase.name === 'setup' || g.phase.name === 'over') fail('No game in progress');
};
const isMoney = (n: number) => Number.isInteger(n) && n >= 0 && n % Math.min(...C.notes) === 0;

function handle(ctx: Ctx, a: Action) {
  const g = ctx.g;
  switch (a.type) {
    case 'setup':
      return setup(ctx, a);

    case 'roll': {
      phaseIs(g, 'turn');
      for (const d of [a.d1, a.d2]) if (!Number.isInteger(d) || d < 1 || d > 6) fail(`Bad die value ${d}`);
      const p = currentPlayer(g);
      if (p.jobStatus === 'looking' && a.d1 === a.d2) {
        p.jobStatus = 'employed';
        ctx.event({ kind: 'gotJob', playerId: p.id, why: 'doubles' });
      }
      return moveBy(ctx, p, a.d1 + a.d2);
    }

    case 'moveTo': {
      phaseIs(g, 'turn', 'land');
      if (!Number.isInteger(a.pos) || a.pos < 0 || a.pos >= BOARD_SIZE) fail('Bad space');
      const p = currentPlayer(g);
      if (g.phase.name === 'turn' && a.passPayday) {
        return moveBy(ctx, p, ((a.pos - p.position + BOARD_SIZE - 1) % BOARD_SIZE) + 1, true);
      }
      ctx.event({ kind: 'move', playerId: p.id, from: p.position, to: a.pos, steps: 0, passedPayday: false });
      p.position = a.pos;
      return arrive(ctx, a.pos);
    }

    case 'next': {
      phaseIs(g, 'after');
      g.turnIndex = (g.turnIndex + 1) % g.players.length;
      const p = currentPlayer(g);
      if (g.flags.lastRound && p.id === g.startPlayerId) {
        g.phase = { name: 'over' };
        ctx.event({ kind: 'gameOver' });
      } else {
        g.phase = { name: 'turn' };
        ctx.event({ kind: 'turn', playerId: p.id });
      }
      return;
    }

    // ---------------- Payday ----------------
    case 'news':
      return news(ctx, a.cardId, a.jobRisk);
    case 'paydaySettle':
      return paydaySettle(ctx, a);
    case 'paydayDone': {
      const ph = payday(g, 'choices');
      const p = getPlayer(g, ph.playerId);
      ctx.step = 'treasury';
      p.paydays += 1;
      treasuryCheck(ctx, p);
      if (p.id === g.startPlayerId && p.paydays === g.settings.endPaydays && !g.flags.lastRound) {
        g.flags.lastRound = true;
        ctx.event({ kind: 'lastRound' });
      }
      p.position = ph.resumeTo;
      return arrive(ctx, ph.resumeTo);
    }
    case 'addSite': {
      const ph = payday(g, 'choices');
      ctx.step = 'choices';
      const h = g.holdings[a.businessId] ?? fail('No such business');
      if (h.ownerId !== ph.playerId) fail('Not your business');
      if (!canAddSite(g, h.businessId)) fail('No Extra Site allowed there');
      const cost = BUSINESS[h.businessId].extraSiteCost!;
      ctx.move(ph.playerId, 'bank', cost, '+ Site', 'I07');
      h.extraSites += 1;
      h.sitesPaid += cost;
      ctx.event({ kind: 'site', businessId: h.businessId, sites: h.extraSites });
      return;
    }
    case 'study': {
      const ph = payday(g, 'choices');
      ctx.step = 'choices';
      return enrol(ctx, getPlayer(g, ph.playerId), a.course, false, !!a.useL15);
    }
    case 'setClip': {
      const ph = payday(g, 'choices');
      if (g.level < 3) fail('Price clips are Level 3');
      const h = g.holdings[a.businessId] ?? fail('No such business');
      const b = BUSINESS[h.businessId];
      if (h.ownerId !== ph.playerId) fail('Not your business');
      if (INDUSTRY[b.industry].kind !== 'customer') fail('Only customer businesses have price clips');
      if (a.clip === 'monopoly' && !ownsAll(g, ph.playerId, b.industry)) fail('Monopoly needs the whole industry');
      h.priceClip = a.clip;
      ctx.event({ kind: 'clip', businessId: h.businessId, clip: a.clip });
      return;
    }
    case 'cancelDeal': {
      const ph = payday(g, 'choices');
      const deal = g.supplyDeals[a.index] ?? fail('No such deal');
      if (deal.a !== ph.playerId && deal.b !== ph.playerId) fail('Not your deal');
      g.supplyDeals.splice(a.index, 1);
      ctx.event({ kind: 'deal', deal, on: false });
      return;
    }

    // ---------------- Landing ----------------
    case 'buy': {
      const space = landing(g, 'business');
      const b = BUSINESS[space.businessId!];
      if (g.holdings[b.id].ownerId !== null) fail('Already owned');
      const p = currentPlayer(g);
      ctx.step = 'land';
      ctx.move(p.id, 'bank', b.price!, 'Buy', b.tile);
      ctx.setOwner(b.id, p.id, 'buy');
      return done(g);
    }
    case 'pass': {
      const space = landing(g, 'business');
      if (g.holdings[space.businessId!].ownerId !== null) fail('Already owned');
      return done(g);
    }
    case 'auction': {
      const space = landing(g, 'business');
      if (g.level < 2) fail('Auctions are Level 2');
      const b = BUSINESS[space.businessId!];
      if (g.holdings[b.id].ownerId !== null) fail('Already owned');
      if (!isMoney(a.bid) || a.bid < C.auctionMinBid) fail(`Minimum bid is $${C.auctionMinBid}`);
      getPlayer(g, a.winnerId);
      ctx.step = 'land';
      ctx.move(a.winnerId, 'bank', a.bid, 'Auction', b.tile);
      ctx.setOwner(b.id, a.winnerId, 'auction');
      return done(g);
    }
    case 'payRent': {
      const space = landing(g, 'business', 'utility');
      const p = currentPlayer(g);
      const q = rentQuote(g, space.pos, p.id, a.payeeId);
      if (q.kind === 'none' && q.note === 'unowned') fail('Nobody owns this');
      if (q.choices) fail('Pick who to pay');
      if (q.note === 'cheapestYours') ctx.event({ kind: 'cheapestIsYours', playerId: p.id, businessId: q.cheapestBiz! });
      ctx.step = 'land';
      if (q.kind !== 'none') {
        const extra = q.qty ? { qty: q.qty, each: q.each } : undefined;
        ctx.move(q.payer!, q.payee!, q.amount, q.label, BUSINESS[q.cheapestBiz ?? q.businessId].tile, extra);
      }
      return done(g);
    }
    case 'drawCard': {
      const space = landing(g, 'life', 'market');
      const card = ACTION_CARD(a.cardId);
      if (card.deck !== space.kind) fail(`That is not a ${space.kind} card`);
      if (!availableCards(g, card.deck as 'life' | 'market').includes(card.id)) fail('That card is held by a player');
      const p = currentPlayer(g);
      ctx.step = 'card';
      ctx.event({ kind: 'card', cardId: card.id, playerId: p.id });
      runOps(ctx, card.effect, p.id, card.id, card.deck, a);
      return done(g);
    }
    case 'taxTime': {
      landing(g, 'tax_time');
      const p = currentPlayer(g);
      const rate = lawParam(g, 'companyTaxPerBusiness') ?? C.companyTaxPerBusiness;
      const qty = owned(g, p.id).length;
      ctx.step = 'land';
      ctx.move(p.id, 'treasury', rate * qty, 'Tax', 'A04', { qty, each: rate });
      return done(g);
    }
    case 'openDay': {
      landing(g, 'open_day');
      ctx.step = 'land';
      if (a.course) enrol(ctx, currentPlayer(g), a.course, true, false);
      return done(g);
    }
    case 'superFund': {
      landing(g, 'super_fund');
      const p = currentPlayer(g);
      if (!isMoney(a.own) || a.own > C.superFundOwnMax || a.own % C.superFundStep !== 0) fail('Bad Super amount');
      ctx.step = 'land';
      if (employed(p)) ctx.move('bank', `super:${p.id}`, C.superFundEmployer, 'Super', 'I09');
      if (a.own > 0) ctx.move(p.id, `super:${p.id}`, a.own, 'Your Super', 'I09');
      return done(g);
    }
    case 'jobCut': {
      landing(g, 'job_cut');
      const p = currentPlayer(g);
      if (jobRisk(ctx, p, 'jobCut', a)) {
        ctx.event({ kind: 'move', playerId: p.id, from: p.position, to: JOB_CENTRE, steps: 0, passedPayday: false });
        p.position = JOB_CENTRE;
      }
      return done(g);
    }
    case 'parliament': {
      landing(g, 'parliament');
      if (g.level < 2) fail('Parliament is Level 2');
      ctx.step = 'parliament';
      vote(ctx, a.cardId, a.passed, a.removeLawId, a.auctions);
      return done(g);
    }

    // ---------------- Side actions ----------------
    case 'loan': {
      notOver(g);
      const p = sidePlayer(g, a.playerId);
      const can = canBorrow(g, p.id);
      if (!can.ok) fail(`No loan: ${can.why}`);
      sideStep(ctx);
      ctx.move('bank', p.id, C.loanSize, 'Loan', 'G01');
      p.loans += 1;
      return;
    }
    case 'repay': {
      notOver(g);
      const p = sidePlayer(g, a.playerId);
      if (p.loans < 1) fail('No loan to repay');
      sideStep(ctx);
      ctx.move(p.id, 'bank', C.loanSize, 'Repay', 'G01');
      p.loans -= 1;
      return;
    }
    case 'sell': {
      notOver(g);
      const h = g.holdings[a.businessId] ?? fail('No such business');
      if (!h.ownerId) fail('Nobody owns it');
      sideStep(ctx);
      ctx.move('bank', h.ownerId, sellValue(g, h.businessId), 'Sell', BUSINESS[h.businessId].tile);
      ctx.setOwner(h.businessId, null, 'sell');
      return;
    }
    case 'trade': {
      notOver(g);
      const h = g.holdings[a.businessId] ?? fail('No such business');
      if (!h.ownerId) fail('Nobody owns it');
      getPlayer(g, a.toPlayerId);
      if (h.ownerId === a.toPlayerId) fail('Already theirs');
      ctx.setOwner(h.businessId, a.toPlayerId, 'trade', true);
      return;
    }
    case 'savings': {
      notOver(g);
      if (g.level < 2) fail('Savings are Level 2');
      const p = sidePlayer(g, a.playerId);
      if (a.amount === 0 || a.amount % C.savingsBlock !== 0) fail(`Savings move in $${C.savingsBlock} blocks`);
      sideStep(ctx);
      if (a.amount > 0) ctx.move(p.id, `savings:${p.id}`, a.amount, 'Savings', 'I06');
      else {
        if (p.savings < -a.amount) fail('Not enough Savings');
        ctx.move(`savings:${p.id}`, p.id, -a.amount, 'Savings', 'I06');
      }
      return;
    }
    case 'deal': {
      notOver(g);
      if (g.level < 3) fail('Supply Deals are Level 3');
      if (a.a === a.b) fail('Two different players');
      for (const [pid, biz] of [[a.a, a.aBiz], [a.b, a.bBiz]] as const) {
        getPlayer(g, pid);
        if (g.holdings[biz]?.ownerId !== pid) fail('Each player must own their business');
        if (g.supplyDeals.filter((d) => d.a === pid || d.b === pid).length >= C.maxSupplyDealsPerPlayer)
          fail(`Up to ${C.maxSupplyDealsPerPlayer} deals each`);
      }
      if (g.supplyDeals.length >= C.supplyDealCards) fail('No Supply Deal cards left');
      if (!linked(BUSINESS[a.aBiz].industry, BUSINESS[a.bBiz].industry)) fail('Industries are not linked');
      const deal = { a: a.a, aBiz: a.aBiz, b: a.b, bBiz: a.bBiz };
      g.supplyDeals.push(deal);
      ctx.event({ kind: 'deal', deal, on: true });
      return;
    }
    case 'bankrupt':
      notOver(g);
      return bankrupt(ctx, getPlayer(g, a.playerId));

    // ---------------- End and teacher ----------------
    case 'lastRound':
      notOver(g);
      if (!g.flags.lastRound) ctx.event({ kind: 'lastRound' });
      g.flags.lastRound = true;
      return;
    case 'endGame':
      notOver(g);
      g.phase = { name: 'over' };
      ctx.event({ kind: 'gameOver' });
      return;
    case 'finalCash':
      phaseIs(g, 'over');
      getPlayer(g, a.playerId);
      if (!Number.isInteger(a.cash) || a.cash < 0) fail('Bad cash amount');
      g.finalCash[a.playerId] = a.cash;
      return;
    case 'budgetNight':
      notOver(g);
      if (g.level < 2) fail('Laws are Level 2');
      ctx.step = 'parliament';
      return vote(ctx, a.cardId, true, a.removeLawId, a.auctions);
    case 'accc':
      notOver(g);
      ctx.step = 'action';
      for (const id of a.playerIds) ctx.move(getPlayer(g, id).id, 'treasury', C.cartelFine, 'ACCC fine', 'I04');
      return;
    case 'setting':
      if (a.noteHelper !== undefined) g.settings.noteHelper = a.noteHelper;
      if (a.rbaMode !== undefined) g.flags.rbaMode = a.rbaMode;
      return;
    case 'edit':
      for (const e of a.edits) edit(ctx, e);
      return;
  }
}

/** Side actions during a Payday are part of its Choices step. */
function sideStep(ctx: Ctx) {
  ctx.step = ctx.g.phase.name === 'payday' ? 'choices' : 'action';
}

const done = (g: Game) => {
  g.phase = { name: 'after' };
};

// ---------------------------------------------------------------------------
// Setup

function setup(ctx: Ctx, a: Extract<Action, { type: 'setup' }>) {
  const g = ctx.g;
  phaseIs(g, 'setup');
  if (![1, 2, 3].includes(a.level)) fail('Level must be 1, 2 or 3');
  if (a.players.length < 3 || a.players.length > 6) fail('3 to 6 players');
  const tokens = new Set(a.players.map((p) => p.token));
  const jobs = new Set(a.players.map((p) => p.jobId));
  if (tokens.size !== a.players.length) fail('Each player needs their own token');
  if (jobs.size !== a.players.length) fail('Each Entry Job card is dealt once');
  for (const p of a.players) {
    if (!/^T0[1-6]$/.test(p.token)) fail(`Bad token ${p.token}`);
    if (JOB[p.jobId]?.level !== 'entry') fail(`${p.jobId} is not an Entry job`);
  }
  if (a.level === 3) {
    for (const id of new Set(a.players.map((p) => p.startingLife ?? fail('Pick a Starting Life card')))) {
      const inDeck = DATA.startingLifeDeck.filter((x) => x === id).length;
      if (a.players.filter((p) => p.startingLife === id).length > inDeck) fail(`Too many ${id} cards`);
    }
  }

  g.level = a.level;
  g.settings.endPaydays = a.endPaydays ?? C.endGamePaydays;
  if (a.timerMinutes) g.settings.timerMinutes = a.timerMinutes;
  ctx.step = 'setup';
  ctx.move('bank', 'treasury', C.treasuryStart, 'Treasury', 'I04');

  a.players.forEach((sp, i) => {
    const startingLife = a.level === 3 ? sp.startingLife : undefined;
    const effect = startingLife ? STARTING(startingLife).effect : undefined;
    const p: Player = {
      id: `p${i + 1}`,
      name: sp.name?.trim() || `Player ${sp.token.slice(1).replace(/^0/, '')}`,
      token: sp.token,
      position: 0,
      jobId: sp.jobId,
      jobStatus: 'employed',
      loans: 0,
      hecs: false,
      superBalance: 0,
      savings: 0,
      bankruptTokens: 0,
      keepCards: [],
      startingLife,
      startCash: effect?.startCash ?? C.startCash,
      freeCourseUsed: false,
      paydays: 0,
    };
    g.players.push(p);
    ctx.move('bank', p.id, p.startCash, 'Start', p.token);
    for (const biz of effect?.owns ?? []) ctx.setOwner(biz, p.id, 'setup');
  });
  g.startPlayerId = g.players[0].id;
  g.turnIndex = 0;
  g.phase = { name: 'turn' };
  ctx.event({ kind: 'turn', playerId: g.startPlayerId });
}

// ---------------------------------------------------------------------------
// Movement and landing

function moveBy(ctx: Ctx, p: Player, steps: number, forcePayday = false) {
  const g = ctx.g;
  const from = p.position;
  const total = from + steps;
  const passedPayday = total >= BOARD_SIZE || forcePayday;
  const to = total % BOARD_SIZE;
  ctx.event({ kind: 'move', playerId: p.id, from, to, steps, passedPayday });
  if (passedPayday) {
    p.position = 0;
    g.phase = { name: 'payday', step: 'news', playerId: p.id, resumeTo: to, lines: [], events: [] };
    return;
  }
  p.position = to;
  arrive(ctx, to);
}

/** The token arrives on a space: open its landing sheet, or finish straight away if nothing happens. */
function arrive(ctx: Ctx, pos: number) {
  const g = ctx.g;
  const p = currentPlayer(g);
  const space = SPACES[pos];
  g.phase = { name: 'land', pos };
  let note: 'yours' | 'rest' | 'visit' | 'payday' | undefined;
  if (space.kind === 'payday') note = 'payday';
  else if (space.kind === 'job_centre') note = 'visit';
  else if (space.kind === 'parliament' && g.level === 1) note = 'rest';
  else if (space.businessId && g.holdings[space.businessId].ownerId === p.id) note = 'yours';
  ctx.event({ kind: 'landed', playerId: p.id, pos, note });
  if (note) done(g);
}

// ---------------------------------------------------------------------------
// Payday (SPEC 7.7 to 7.9)

function bumpTrack(ctx: Ctx, track: 'prices' | 'wages' | 'interest', by: number, why: string): boolean {
  const g = ctx.g;
  if (track === 'interest') {
    const i = RATES.indexOf(g.interest);
    const to = RATES[Math.max(0, Math.min(RATES.length - 1, i + by))];
    if (to === g.interest) return false;
    ctx.event({ kind: 'track', track, from: g.interest, to, why });
    g.interest = to;
    return true;
  }
  const positions = DATA.tracks[track].positions;
  const to = Math.max(positions[0], Math.min(positions[positions.length - 1], g[track] + by));
  if (to === g[track]) return false;
  ctx.event({ kind: 'track', track, from: g[track], to, why });
  g[track] = to;
  return true;
}

function news(ctx: Ctx, cardId: string, jobRiskInputs: OpInputs['jobRisk']) {
  const g = ctx.g;
  const ph = payday(g, 'news');
  const p = getPlayer(g, ph.playerId);
  const card = NEWS(cardId);
  ctx.step = 'news';

  // M16 at Level 3 lasts until the owner's next Payday.
  for (const h of Object.values(g.holdings)) if (h.forcedStandardUntilPaydayOf === p.id) delete h.forcedStandardUntilPaydayOf;

  if (g.flags.noNewLoans) {
    g.flags.noNewLoans = false;
    ctx.event({ kind: 'flag', flag: 'noNewLoans', on: false });
  }
  let arrow = card.economy;
  if (g.level >= 2) {
    if ((g.interest === 'HIGH' || g.interest === 'VERY HIGH') && arrow > 0) arrow -= 1;
    if (g.interest === 'LOW' && arrow < 0) arrow += 1;
  }
  const old: Econ = g.economy;
  g.economy = ECON[Math.max(0, Math.min(ECON.length - 1, econIndex(old) + arrow))];
  ctx.event({ kind: 'economy', from: old, to: g.economy, cardArrow: card.economy, arrow });

  ctx.event({ kind: 'card', cardId, playerId: p.id });
  runOps(ctx, card.effect, p.id, cardId, 'news', { jobRisk: jobRiskInputs });

  const recession = ECON[0];
  const up = econIndex(g.economy) > econIndex(old);
  const down = econIndex(g.economy) < econIndex(old);
  if (g.economy === recession && old !== recession)
    for (const w of g.players) if (employed(w)) jobRisk(ctx, w, 'recession', jobRiskInputs?.[w.id]);
  if (up && (g.economy === 'GROWTH' || g.economy === 'BOOM'))
    for (const w of g.players)
      if (w.jobStatus === 'looking') {
        w.jobStatus = 'employed';
        ctx.event({ kind: 'gotJob', playerId: w.id, why: 'economy' });
      }

  if (g.level >= 2) {
    let pricesUp = false;
    if (card.level2?.prices) pricesUp = bumpTrack(ctx, 'prices', card.level2.prices, 'card') || pricesUp;
    if (card.level2?.wages) bumpTrack(ctx, 'wages', card.level2.wages, 'card');
    if (g.economy === 'BOOM') pricesUp = bumpTrack(ctx, 'prices', 1, 'boom') || pricesUp;
    if (!g.flags.rbaMode) {
      if (pricesUp) bumpTrack(ctx, 'interest', 1, 'prices');
      if (down && (g.economy === 'SLOW' || g.economy === recession)) bumpTrack(ctx, 'interest', -1, 'slowdown');
    }
    if (up && g.economy === 'GROWTH') bumpTrack(ctx, 'wages', 1, 'growth');
  }

  g.record.push({
    n: g.record.length + 1,
    playerId: p.id,
    playerPayday: p.paydays + 1,
    newsCard: cardId,
    economy: g.economy,
    prices: g.level >= 2 ? g.prices : null,
    wages: g.level >= 2 ? g.wages : null,
    interest: g.level >= 2 ? (g.interest as Rate) : null,
    outOfWork: g.players.filter((x) => x.jobStatus === 'looking').length,
    treasury: g.treasury,
    bonds: g.bonds,
    projectsBuilt: g.projectsBuilt,
  });
  ph.newsCard = cardId;
  ph.step = 'settle';
}

/** Payday steps 2 to 6: income, profit, projects, living costs and debts. */
function paydaySettle(ctx: Ctx, a: Extract<Action, { type: 'paydaySettle' }>) {
  const g = ctx.g;
  const ph = payday(g, 'settle');
  const p = getPlayer(g, ph.playerId);

  // 2. Income
  ctx.step = 'income';
  if (p.pendingUpgrade && a.upgradeJobId) {
    const free = freeJobs(g, p.pendingUpgrade);
    if (!free.some((j) => j.id === a.upgradeJobId)) fail('That job card is not free');
    swapJob(ctx, p, a.upgradeJobId);
    delete p.pendingUpgrade;
  }
  if (p.jobStatus === 'employed') {
    const level = JOB[p.jobId].level;
    const info = DATA.jobLevels[level];
    const takeHome =
      info.takeHome +
      (g.level >= 2 ? g.wages * DATA.tracks.wages.takeHomeBonusPerStep : 0) +
      (level === 'entry' ? (lawParam(g, 'entryTakeHomeBonus') ?? 0) : 0) +
      (lawParam(g, 'takeHomeBonus') ?? 0) +
      (p.startingLife ? (STARTING(p.startingLife).effect.takeHomeAdjust ?? 0) : 0);
    const tax = Math.max(0, info.tax - (lawParam(g, 'taxCut') ?? 0));
    ctx.move('bank', p.id, Math.max(0, takeHome), 'Wage', p.jobId);
    ctx.move('bank', 'treasury', tax, 'Tax', 'I04');
  } else if (p.jobStatus === 'looking') {
    ctx.move('treasury', p.id, lawParam(g, 'jobSeeker') ?? C.jobSeeker, 'JobSeeker', 'K07');
  } else if (p.study) {
    ctx.move('treasury', p.id, C.studyAllowance, 'Study', 'I08');
    p.study.tokensLeft -= 1;
    ctx.event({ kind: 'studyStep', playerId: p.id, tokensLeft: p.study.tokensLeft });
    if (p.study.tokensLeft <= 0) {
      const target = p.study.target;
      const free = freeJobs(g, target);
      delete p.study;
      p.jobStatus = 'employed';
      if (free.length > 0) {
        const pick = a.newJobId ?? fail('Pick a new job card');
        if (!free.some((j) => j.id === pick)) fail('That job card is not free');
        swapJob(ctx, p, pick);
        ctx.event({ kind: 'gotJob', playerId: p.id, why: 'study' });
      } else {
        p.pendingUpgrade = target;
      }
      ctx.event({ kind: 'studyDone', playerId: p.id, waiting: free.length === 0 });
    }
  }

  // 3. Profit
  ctx.step = 'profit';
  for (const h of owned(g, p.id)) {
    const b = BUSINESS[h.businessId];
    const each = b.profit[g.economy];
    const qty = 1 + h.extraSites;
    ctx.bankSigned(p.id, each * qty, b.name, b.tile, { qty, each });
  }
  if (g.level >= 3)
    for (const d of g.supplyDeals)
      if (d.a === p.id || d.b === p.id) ctx.move('bank', p.id, C.supplyDealPerPayday, 'Supply Deal', 'G05');
  for (const l of lawsInOrder(g)) runOps(ctx, POLICY(l.id).effect.payday ?? [], p.id, l.id, 'policy');

  // 4. Projects
  ctx.step = 'projects';
  ctx.move('bank', p.id, C.projectPaysPerPlayer * g.projectsBuilt, 'Projects', DATA.projects[Math.max(0, g.projectsBuilt - 1)].tile, {
    qty: g.projectsBuilt,
    each: C.projectPaysPerPlayer,
  });

  // 5. Living costs
  ctx.step = 'living';
  const living = livingCost(g, p);
  ctx.move(p.id, 'bank', living.total, 'Living', 'MAT');
  if (living.gst > 0) ctx.move(p.id, 'treasury', living.gst, 'GST', 'I04');

  // 6. Debts
  ctx.step = 'debts';
  if (p.loans > 0) {
    const rate = g.level === 1 ? C.loanInterestLevel1 : DATA.tracks.interest.loanInterest[g.interest];
    ctx.move(p.id, 'bank', p.loans * rate, 'Interest', 'G01', { qty: p.loans, each: rate });
  }
  if (p.hecs) ctx.move(p.id, 'treasury', C.hecsPerPayday, 'HECS', 'G03');
  if (g.level >= 2) {
    const blocks = Math.floor(p.savings / C.savingsBlock);
    const each = DATA.tracks.interest.savingsInterestPer200[g.interest];
    if (blocks > 0) ctx.move('bank', p.id, blocks * each, 'Savings', 'I03', { qty: blocks, each });
  }
  const threshold = lawParam(g, 'fortuneThreshold');
  if (threshold !== undefined) {
    const over = p.savings > threshold || (a.fortune ?? fail('Ask about cash'));
    if (over) ctx.move(p.id, 'treasury', lawParam(g, 'fortuneTax')!, 'Fortune tax', 'P14');
  }
  if (p.bankruptTokens > 0) {
    p.bankruptTokens -= 1;
    ctx.event({ kind: 'bankruptToken', playerId: p.id, left: p.bankruptTokens });
  }
  ph.step = 'choices';
}

function swapJob(ctx: Ctx, p: Player, jobId: string) {
  const oldJobId = p.jobId;
  p.jobId = jobId;
  p.jobStatus = 'employed';
  ctx.event({ kind: 'newJob', playerId: p.id, jobId, oldJobId });
}

/** SPEC 7.9, after every Payday. */
function treasuryCheck(ctx: Ctx, p: Player) {
  const g = ctx.g;
  if (g.level >= 2 && p.id === g.startPlayerId && g.bonds > 0)
    ctx.move('treasury', 'bank', C.bondInterestLevel2 * g.bonds, 'Bond interest', 'G02', { qty: g.bonds, each: C.bondInterestLevel2 });
  if (g.level >= 2)
    while (g.bonds > 0 && g.treasury >= C.projectBuildThreshold) {
      ctx.move('treasury', 'bank', C.bondSize, 'Repay Bond', 'G02');
      g.bonds -= 1;
      ctx.event({ kind: 'bondRepaid', bonds: g.bonds });
    }
  if (g.treasury >= C.projectBuildThreshold) ctx.buildProject();
}

// ---------------------------------------------------------------------------
// Study, Parliament, bankruptcy, teacher edits

function enrol(ctx: Ctx, p: Player, course: 'tafe' | 'uni', openDay: boolean, useCard: boolean) {
  const opt = studyOptions(ctx.g, p.id, openDay, useCard)[course];
  if (!opt.ok) fail(`Cannot enrol in ${course === 'tafe' ? 'TAFE' : 'Uni'}`);
  if (opt.freeBy === 'family') p.freeCourseUsed = true;
  if (opt.freeBy === 'card') {
    p.keepCards = p.keepCards.filter((c) => c !== FREE_COURSE_CARD);
    ctx.event({ kind: 'keepCard', playerId: p.id, cardId: FREE_COURSE_CARD, on: false });
  }
  if (opt.fee > 0) ctx.move(p.id, 'treasury', opt.fee, 'TAFE fee', 'A03');
  if (opt.hecs) p.hecs = true;
  p.jobStatus = 'studying';
  p.study =
    course === 'tafe'
      ? { kind: 'tafe', tokensLeft: C.tafeTokens, target: 'skilled' }
      : { kind: 'uni', tokensLeft: C.uniTokens, target: 'professional' };
  ctx.event({ kind: 'enrolled', playerId: p.id, course, fee: opt.fee, hecs: opt.hecs, freeBy: opt.freeBy });
}

function vote(ctx: Ctx, cardId: string, passed: boolean, removeLawId?: string, auctions?: AuctionResult[]) {
  const g = ctx.g;
  const card = POLICY(cardId);
  if (lawInForce(g, cardId)) fail('That law is already in force');
  ctx.event({ kind: 'vote', cardId, passed });
  if (!passed) return;
  if (card.isLaw) {
    if (g.laws.length >= C.maxLaws) {
      const out = removeLawId ?? fail('Pick a law to remove');
      if (!lawInForce(g, out)) fail('That law is not in force');
      g.laws = g.laws.filter((l) => l.id !== out);
      ctx.event({ kind: 'law', cardId: out, on: false });
    }
    g.seq += 1;
    g.laws.push({ id: cardId, passedAt: g.seq });
    ctx.event({ kind: 'law', cardId, on: true });
  }
  runOps(ctx, card.effect.oneOff ?? [], currentPlayer(g).id, cardId, 'policy', { auctions });
}

function bankrupt(ctx: Ctx, p: Player) {
  const g = ctx.g;
  ctx.step = 'action';
  if (p.savings > 0) ctx.move(`savings:${p.id}`, p.id, p.savings, 'Savings', 'I06');
  for (const h of owned(g, p.id)) ctx.setOwner(h.businessId, null, 'bankrupt');
  g.supplyDeals = g.supplyDeals.filter((d) => d.a !== p.id && d.b !== p.id);
  p.loans = 0;
  p.bankruptTokens = C.bankruptTokens;
  ctx.event({ kind: 'bankrupt', playerId: p.id });
}

function edit(ctx: Ctx, e: Edit) {
  const g = ctx.g;
  switch (e.target) {
    case 'game': {
      const v = e.value;
      if (e.field === 'economy') {
        if (!ECON.includes(v as Econ)) fail('Bad economy');
        g.economy = v as Econ;
      } else if (e.field === 'interest') {
        if (!RATES.includes(v as Rate)) fail('Bad interest');
        g.interest = v as Rate;
      } else {
        if (typeof v !== 'number' || !Number.isInteger(v)) fail('Bad number');
        if (e.field === 'prices' || e.field === 'wages') {
          const pos = DATA.tracks[e.field].positions;
          if (!pos.includes(v as number)) fail('Off the track');
        }
        if (e.field === 'projectsBuilt' && ((v as number) < 0 || (v as number) > DATA.projects.length)) fail('Bad projects');
        g[e.field] = v as number;
      }
      return;
    }
    case 'player': {
      const p = getPlayer(g, e.playerId);
      const v = e.value;
      switch (e.field) {
        case 'name':
          p.name = String(v);
          return;
        case 'hecs':
          p.hecs = !!v;
          return;
        case 'jobId':
          if (!JOB[v as string]) fail('Bad job');
          p.jobId = v as string;
          return;
        case 'jobStatus':
          if (!['employed', 'looking', 'studying'].includes(v as string)) fail('Bad job status');
          p.jobStatus = v as Player['jobStatus'];
          if (p.jobStatus !== 'studying') delete p.study;
          else if (!p.study) p.study = { kind: 'tafe', tokensLeft: C.tafeTokens, target: 'skilled' };
          return;
        case 'keepCards':
          p.keepCards = [...(v as string[])];
          return;
        default:
          if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) fail('Bad number');
          if (e.field === 'position' && (v as number) >= BOARD_SIZE) fail('Bad space');
          p[e.field] = v as number;
      }
      return;
    }
    case 'holding': {
      const h = g.holdings[e.businessId] ?? fail('No such business');
      if (e.field === 'ownerId') {
        if (e.value !== null) getPlayer(g, e.value as string);
        ctx.setOwner(h.businessId, e.value as string | null, 'edit', true);
      } else if (e.field === 'priceClip') {
        h.priceClip = e.value as Holding['priceClip'];
      } else {
        if (typeof e.value !== 'number' || e.value < 0) fail('Bad number');
        if (e.field === 'extraSites' && e.value > C.maxExtraSites) fail('Too many sites');
        h[e.field] = e.value;
      }
      return;
    }
    case 'law':
      if (e.on) {
        if (lawInForce(g, e.cardId)) return;
        POLICY(e.cardId);
        g.seq += 1;
        g.laws.push({ id: e.cardId, passedAt: g.seq });
      } else g.laws = g.laws.filter((l) => l.id !== e.cardId);
      ctx.event({ kind: 'law', cardId: e.cardId, on: e.on });
      return;
  }
}
