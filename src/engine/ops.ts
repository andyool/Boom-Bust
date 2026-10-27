// Interprets the `effect` ops on News, Life, Market and Policy cards (game-data.json).
import { BUSINESS, C, DATA, INDUSTRY, JOB, businessesIn, type Cond, type MoneyOp, type Op } from './data';
import type { Ctx } from './ctx';
import {
  VOLUNTEER_CARD, canAddSite, countPer, employed, fail, getPlayer, holdsCard, jobLevel, lawInForce, owned, ownsAll, rollLoses,
} from './helpers';
import { roundUpToNote } from './money';
import type { AuctionResult, Player, RiskInput } from './types';

export interface OpInputs {
  answer?: boolean;
  businessId?: string;
  otherId?: string;
  jobRisk?: Record<string, RiskInput>;
  auctions?: AuctionResult[];
}

const LABEL: Record<string, string> = { news: 'News', life: 'Life', market: 'Market', policy: 'Law' };

export function runOps(ctx: Ctx, ops: Op[], drawerId: string, cardId: string, deck: string, inputs: OpInputs = {}) {
  for (const op of ops) runOp(ctx, op, drawerId, cardId, deck, inputs);
}

function checkCond(ctx: Ctx, p: Player, cond: Cond | undefined): boolean {
  if (!cond) return true;
  if (typeof cond === 'object') return owned(ctx.g, p.id).some((h) => cond.ownsAnyIn.includes(BUSINESS[h.businessId].industry));
  switch (cond) {
    case 'employed':
      return employed(p);
    case 'employedEntry':
      return employed(p) && jobLevel(p) === 'entry';
    case 'employedSkilledUp':
      return employed(p) && jobLevel(p) !== 'entry';
    case 'ownsAnyBusiness':
      return owned(ctx.g, p.id).length > 0;
  }
}

function moneyOp(ctx: Ctx, op: MoneyOp, drawerId: string, cardId: string, deck: string, inputs: OpInputs) {
  const g = ctx.g;
  let subjects: Player[];
  switch (op.who) {
    case 'drawer':
      subjects = [getPlayer(g, drawerId)];
      break;
    case 'each':
      subjects = g.players;
      break;
    case 'others':
      subjects = g.players.filter((p) => p.id !== drawerId);
      break;
    case 'ownerOf': {
      const owner = g.holdings[op.business!].ownerId;
      subjects = owner ? [getPlayer(g, owner)] : [];
      break;
    }
  }
  let amount = op.amount;
  for (const [law, value] of Object.entries(op.lawAmount ?? {})) if (lawInForce(g, law)) amount = value;

  for (const p of subjects) {
    if (!checkCond(ctx, p, op.if)) continue;
    if (op.ask) {
      if (inputs.answer === undefined) fail(`${cardId} needs an answer`);
      if (!inputs.answer) continue;
    }
    if (op.unlessKeep && holdsCard(p, op.unlessKeep)) {
      p.keepCards = p.keepCards.filter((c) => c !== op.unlessKeep);
      ctx.event({ kind: 'keepCard', playerId: p.id, cardId: op.unlessKeep, on: false });
      continue;
    }
    const qty = op.per ? countPer(g, p.id, op.per) : 1;
    if (qty === 0) continue;
    const total = amount * qty;
    const other = op.with === 'drawer' ? drawerId : op.with;
    const label = LABEL[deck] ?? 'Card';
    const extra = op.per ? { qty, each: amount } : undefined;
    if (op.do === 'pay') ctx.move(p.id, other, total, label, cardId, extra);
    else ctx.move(other, p.id, total, label, cardId, extra);
  }
}

/** A Job Risk check (SPEC 5.7, 7.5). `forceLose` is for cards that name jobs (no roll). */
export function jobRisk(ctx: Ctx, p: Player, why: 'recession' | 'jobCut' | 'card', input: RiskInput | undefined, forceLose = false) {
  if (!employed(p)) return false;
  const needsRoll = !forceLose && DATA.jobLevels[jobLevel(p)].jobRisk !== 'always_lose';
  let lose = true;
  if (needsRoll) {
    const roll = input?.roll ?? fail(`${p.name} needs a Job Risk roll`);
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) fail(`Bad die value ${roll}`);
    lose = rollLoses(p, roll);
  }
  const roll = needsRoll ? input?.roll : undefined;
  if (lose && input?.volunteer && holdsCard(p, VOLUNTEER_CARD)) {
    p.keepCards = p.keepCards.filter((c) => c !== VOLUNTEER_CARD);
    ctx.event({ kind: 'keepCard', playerId: p.id, cardId: VOLUNTEER_CARD, on: false });
    ctx.event({ kind: 'keptJob', playerId: p.id, why, roll, volunteer: true });
    return false;
  }
  if (lose) {
    p.jobStatus = 'looking';
    ctx.event({ kind: 'lostJob', playerId: p.id, why, roll });
    return true;
  }
  ctx.event({ kind: 'keptJob', playerId: p.id, why, roll });
  return false;
}

function runOp(ctx: Ctx, op: Op, drawerId: string, cardId: string, deck: string, inputs: OpInputs) {
  const g = ctx.g;
  const drawer = () => getPlayer(g, drawerId);
  switch (op.do) {
    case 'pay':
    case 'collect':
      return moneyOp(ctx, op, drawerId, cardId, deck, inputs);

    case 'buildProject':
      ctx.buildProject();
      return;

    case 'setFlag':
      g.flags[op.flag] = true;
      ctx.event({ kind: 'flag', flag: op.flag, on: true });
      return;

    case 'superLoss':
      for (const p of g.players) {
        const x = Math.min(op.amount, p.superBalance);
        if (x > 0) ctx.move(`super:${p.id}`, 'bank', x, 'Super', cardId);
      }
      return;

    case 'loseJob':
      for (const p of g.players)
        if (employed(p) && op.jobs.includes(p.jobId)) jobRisk(ctx, p, 'card', inputs.jobRisk?.[p.id], true);
      return;

    case 'regainJob':
      for (const p of g.players)
        if (p.jobStatus === 'looking' && op.levels.includes(JOB[p.jobId].level)) {
          p.jobStatus = 'employed';
          ctx.event({ kind: 'gotJob', playerId: p.id, why: 'card' });
        }
      return;

    case 'treasuryToBank':
      ctx.move('treasury', 'bank', op.amount, LABEL[deck], cardId);
      return;

    case 'keep': {
      const p = drawer();
      if (op.ask) {
        if (inputs.answer === undefined) fail(`${cardId} needs an answer`);
        if (!inputs.answer) return;
      }
      if (op.cost) ctx.move(p.id, op.with ?? 'bank', op.cost, LABEL[deck], cardId);
      p.keepCards.push(cardId);
      ctx.event({ kind: 'keepCard', playerId: p.id, cardId, on: true });
      return;
    }

    case 'discountSite': {
      if (!inputs.businessId) return; // optional
      const h = g.holdings[inputs.businessId];
      if (h.ownerId !== drawerId) fail('Not your business');
      if (!canAddSite(g, h.businessId)) fail('No Extra Site allowed there');
      const cost = roundUpToNote(BUSINESS[h.businessId].extraSiteCost! * op.fraction);
      ctx.move(drawerId, 'bank', cost, '+ Site', 'I07');
      h.extraSites += 1;
      h.sitesPaid += cost;
      ctx.event({ kind: 'site', businessId: h.businessId, sites: h.extraSites });
      return;
    }

    case 'bargain': {
      if (!inputs.businessId) return; // optional
      const b = BUSINESS[inputs.businessId];
      const h = g.holdings[b.id];
      if (h.ownerId !== null || b.price === null) fail('That business is not for sale');
      ctx.move(drawerId, 'bank', roundUpToNote(b.price! * op.fraction), 'Bargain', b.tile);
      ctx.setOwner(b.id, drawerId, 'bargain');
      return;
    }

    case 'supplyBonus': {
      const others = g.players.filter((p) => p.id !== drawerId && owned(g, p.id).length > 0);
      if (others.length === 0) return;
      const other = inputs.otherId ?? fail(`${cardId} needs a player`);
      if (!others.some((p) => p.id === other)) fail('That player owns no business');
      ctx.move(op.with, drawerId, op.amount, LABEL[deck], cardId);
      ctx.move(op.with, other, op.amount, LABEL[deck], cardId);
      return;
    }

    case 'monopolyFine':
      for (const p of g.players)
        for (const ind of Object.keys(INDUSTRY)) {
          if (INDUSTRY[ind].kind === 'utility' || !ownsAll(g, p.id, ind)) continue;
          ctx.move(p.id, op.with, op.amount, 'Fine', cardId);
          if (g.level === 3 && op.level3ForceStandard)
            for (const b of businessesIn(ind)) g.holdings[b.id].forcedStandardUntilPaydayOf = p.id;
        }
      return;

    case 'auctionUtilities':
      for (const id of op.businesses) {
        const h = g.holdings[id];
        if (h.ownerId !== null) continue;
        const result = inputs.auctions?.find((a) => a.businessId === id);
        if (!result?.winnerId) continue; // no bid: stays government-owned
        if (result.bid < C.utilityAuctionMinBid) fail(`Minimum bid is $${C.utilityAuctionMinBid}`);
        ctx.move(result.winnerId, 'treasury', result.bid, 'Auction', BUSINESS[id].tile);
        ctx.setOwner(id, result.winnerId, 'auction');
        h.price = result.bid;
      }
      return;
  }
}
