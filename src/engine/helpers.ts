// Pure queries on a game. The UI uses these to preview outcomes and decide what to ask.
import {
  BUSINESS, C, CARD, DATA, ECON, INDUSTRY, JOB, NEWS, POLICY, SPACES, STARTING, businessesIn,
  type ActionCard, type Clip, type Econ, type Job, type JobLevel, type LawParams, type Per,
} from './data';
import { half } from './money';
import type { Game, Holding, Player } from './types';

export class RuleError extends Error {}

export function fail(msg: string): never {
  throw new RuleError(msg);
}

export function getPlayer(g: Game, id: string): Player {
  return g.players.find((p) => p.id === id) ?? fail(`No player ${id}`);
}
export const currentPlayer = (g: Game): Player => g.players[g.turnIndex];
export const econIndex = (e: Econ) => ECON.indexOf(e);
export const employed = (p: Player) => p.jobStatus === 'employed';
export const jobLevel = (p: Player): JobLevel => JOB[p.jobId].level;
export const holdsCard = (p: Player, cardId: string) => p.keepCards.includes(cardId);

/** Life cards found by what they do, so card IDs are not hard-coded. */
const lifeKeep = (pred: (op: Extract<ActionCard['effect'][number], { do: 'keep' }>) => boolean) =>
  DATA.cards.life.find((c) => c.effect.some((op) => op.do === 'keep' && pred(op)))!.id;
export const VOLUNTEER_CARD = lifeKeep((op) => !!op.saveJob); // L12
export const SHARE_HOUSE_CARD = lifeKeep((op) => op.livingAdjust !== undefined); // L13
export const FREE_COURSE_CARD = lifeKeep((op) => !!op.freeTafe); // L15
export const INSURANCE_CARD = lifeKeep((op) => !!op.cancels); // L19

/** Board order of businesses, used to list a player's businesses consistently. */
const BOARD_ORDER: string[] = SPACES.filter((s) => s.businessId).map((s) => s.businessId!);

/** Every business a player owns, in board order (includes transport and sold utilities). */
export function owned(g: Game, pid: string): Holding[] {
  return BOARD_ORDER.map((id) => g.holdings[id]).filter((h) => h.ownerId === pid);
}

export function countPer(g: Game, pid: string, per: Per): number {
  return owned(g, pid).filter((h) => {
    const b = BUSINESS[h.businessId];
    if (per.except?.includes(b.id)) return false;
    if (per.all) return true;
    return !!per.industries?.includes(b.industry) || !!per.businesses?.includes(b.id);
  }).length;
}

export function ownsAll(g: Game, pid: string, industry: string): boolean {
  if (INDUSTRY[industry].kind === 'utility') return false;
  return businessesIn(industry).every((b) => g.holdings[b.id].ownerId === pid);
}

// ---------- Laws ----------

export const lawInForce = (g: Game, id: string) => g.laws.some((l) => l.id === id);
export const lawsInOrder = (g: Game) => [...g.laws].sort((a, b) => a.passedAt - b.passedAt);

/** The setting from the most recently passed law that has it (latest law wins). */
export function lawParam<K extends keyof LawParams>(g: Game, key: K): LawParams[K] | undefined {
  let value: LawParams[K] | undefined;
  for (const l of lawsInOrder(g)) {
    const v = POLICY(l.id).effect.law?.[key];
    if (v !== undefined) value = v;
  }
  return value;
}

/** Adds up a numeric setting across every law in force (P12 and P16 both change living costs). */
export function lawSum(g: Game, key: 'livingAdjust' | 'livingToTreasury'): number {
  return g.laws.reduce((sum, l) => sum + (POLICY(l.id).effect.law?.[key] ?? 0), 0);
}

/** The P13-style price cap that applies to this business, if any. */
function priceCap(g: Game, businessId: string): LawParams | undefined {
  const b = BUSINESS[businessId];
  for (const l of lawsInOrder(g).reverse()) {
    const law = POLICY(l.id).effect.law;
    if (law?.customerPriceCut !== undefined && (law.capIndustries?.includes(b.industry) || law.capBusinesses?.includes(b.id)))
      return law;
  }
  return undefined;
}

// ---------- Prices on landing ----------

/** The clip a customer business actually charges at Level 3. */
export function effectiveClip(g: Game, h: Holding): Clip {
  const b = BUSINESS[h.businessId];
  const cap = priceCap(g, h.businessId);
  if (cap?.level3Clip) return cap.level3Clip;
  if (h.forcedStandardUntilPaydayOf) return 'standard';
  if (h.priceClip === 'monopoly' && !ownsAll(g, h.ownerId!, b.industry)) return 'standard';
  return h.priceClip;
}

/** What a customer pays at this owned customer business (SPEC 7.3). */
export function chargeFor(g: Game, h: Holding): { amount: number; clip: Clip } {
  const b = BUSINESS[h.businessId];
  const cp = b.customerPrices ?? fail(`${b.name} has no customer prices`);
  let clip: Clip;
  if (g.level < 3) clip = ownsAll(g, h.ownerId!, b.industry) ? 'monopoly' : 'standard';
  else clip = effectiveClip(g, h);
  let amount = cp[clip];
  if (g.level >= 2) {
    const t = DATA.tracks.prices;
    if (g.prices >= t.customerPriceBonusFrom) amount += t.customerPriceBonus;
    const cap = priceCap(g, h.businessId);
    // DECISIONS.md: at Level 3 the cap means Budget only; the -$10 applies at Level 2.
    if (cap && g.level === 2) amount = Math.max(0, amount - cap.customerPriceCut!);
  }
  return { amount, clip };
}

export interface RentQuote {
  kind: 'none' | 'customer' | 'employer' | 'transport' | 'utility';
  businessId: string;
  payer?: string;
  payee?: string;
  amount: number;
  label: string;
  /** Level 3 tie between other owners: the lander picks one of these. */
  choices?: string[];
  /** Level 3: the business whose price is charged. */
  cheapestBiz?: string;
  clip?: Clip;
  note?: 'yours' | 'cheapestYours' | 'unowned' | 'monopoly' | 'standard' | 'ownsAll';
  qty?: number;
  each?: number;
}

/** Who pays whom when `landerId` lands on business space `pos` (SPEC 7.3). */
export function rentQuote(g: Game, pos: number, landerId: string, payeeId?: string): RentQuote {
  const space = SPACES[pos];
  const businessId = space.businessId ?? fail(`Space ${pos} is not a business`);
  const b = BUSINESS[businessId];
  const ind = INDUSTRY[b.industry];
  const h = g.holdings[businessId];
  const none = (note: RentQuote['note']): RentQuote => ({ kind: 'none', businessId, amount: 0, label: '', note });

  if (ind.kind === 'utility') {
    const bill = ind.bill ?? C.utilityBill;
    if (h.ownerId === landerId) return none('yours');
    return { kind: 'utility', businessId, payer: landerId, payee: h.ownerId ?? 'treasury', amount: bill, label: 'Bill' };
  }
  if (h.ownerId === null) return none('unowned');
  if (h.ownerId === landerId) return none('yours');
  const owner = h.ownerId;

  if (ind.kind === 'employer') {
    const all = ownsAll(g, owner, b.industry);
    return {
      kind: 'employer', businessId, payer: owner, payee: landerId, label: 'Shift pay',
      amount: all ? ind.shiftPayIfOwnsAll! : ind.shiftPay!, note: all ? 'ownsAll' : undefined,
    };
  }
  if (ind.kind === 'transport') {
    const qty = owned(g, owner).filter((x) => BUSINESS[x.businessId].industry === b.industry).length;
    const each = ind.perTransportOwned!;
    return { kind: 'transport', businessId, payer: landerId, payee: owner, amount: qty * each, qty, each, label: 'Transport' };
  }

  // Customer industries.
  if (g.level < 3) {
    const { amount, clip } = chargeFor(g, h);
    return {
      kind: 'customer', businessId, payer: landerId, payee: owner, amount, clip,
      label: clip === 'monopoly' ? 'Monopoly' : 'Standard', note: clip === 'monopoly' ? 'monopoly' : 'standard',
    };
  }
  // Level 3: customers shop around and pay the cheapest owner in the industry.
  const offers = businessesIn(b.industry)
    .map((x) => g.holdings[x.id])
    .filter((x) => x.ownerId !== null)
    .map((x) => ({ h: x, ...chargeFor(g, x) }));
  const min = Math.min(...offers.map((o) => o.amount));
  const cheapest = offers.filter((o) => o.amount === min);
  const mine = cheapest.find((o) => o.h.ownerId === landerId);
  if (mine) return { ...none('cheapestYours'), cheapestBiz: mine.h.businessId };
  const pick = (o: (typeof offers)[number]): RentQuote => ({
    kind: 'customer', businessId, payer: landerId, payee: o.h.ownerId!, amount: o.amount, clip: o.clip,
    cheapestBiz: o.h.businessId, label: 'Cheapest',
  });
  const landed = cheapest.find((o) => o.h.businessId === businessId) ?? cheapest.find((o) => o.h.ownerId === owner);
  if (landed) return pick(landed);
  const owners = [...new Set(cheapest.map((o) => o.h.ownerId!))];
  if (owners.length === 1) return pick(cheapest[0]);
  if (payeeId && owners.includes(payeeId)) return pick(cheapest.find((o) => o.h.ownerId === payeeId)!);
  return { kind: 'customer', businessId, payer: landerId, amount: min, label: 'Cheapest', choices: owners };
}

// ---------- Loans, study, jobs ----------

export function loanLimit(g: Game, pid: string): number {
  const p = getPlayer(g, pid);
  return owned(g, pid).length + (employed(p) ? 1 : 0);
}

export function canBorrow(g: Game, pid: string): { ok: boolean; why?: 'noNewLoans' | 'bankrupt' | 'limit' } {
  const p = getPlayer(g, pid);
  if (g.flags.noNewLoans) return { ok: false, why: 'noNewLoans' };
  if (p.bankruptTokens > 0) return { ok: false, why: 'bankrupt' };
  if (p.loans >= loanLimit(g, pid)) return { ok: false, why: 'limit' };
  return { ok: true };
}

export function freeJobs(g: Game, level: JobLevel): Job[] {
  const held = new Set(g.players.map((p) => p.jobId));
  return DATA.jobs.filter((j) => j.level === level && !held.has(j.id));
}

export interface StudyOption {
  ok: boolean;
  fee: number; // TAFE fee to Treasury
  hecs: boolean; // Uni: takes a HECS card
  freeBy?: 'openDay' | 'law' | 'family' | 'card';
  /** TAFE only: the player may hand in L15 to skip the fee. */
  canUseCard: boolean;
}

const familyHelp = (p: Player) =>
  !!p.startingLife && !!STARTING(p.startingLife).effect.freeFirstCourse && !p.freeCourseUsed;

/** Can this player enrol, and what does it cost? (SPEC 7.6; DECISIONS.md for S01) */
export function studyOptions(g: Game, pid: string, openDay: boolean, useCard = false): { tafe: StudyOption; uni: StudyOption } {
  const p = getPlayer(g, pid);
  const studying = p.jobStatus === 'studying';
  const looking = p.jobStatus === 'looking';
  const level = jobLevel(p);

  const tafe: StudyOption = { ok: !studying && (level === 'entry' || looking), fee: 0, hecs: false, canUseCard: false };
  const lawFee = lawParam(g, 'tafeFee');
  if (openDay) tafe.freeBy = 'openDay';
  else if (lawFee !== undefined && lawFee === 0) tafe.freeBy = 'law';
  else if (familyHelp(p)) tafe.freeBy = 'family';
  else {
    tafe.canUseCard = holdsCard(p, FREE_COURSE_CARD);
    if (tafe.canUseCard && useCard) tafe.freeBy = 'card';
    else tafe.fee = lawFee ?? (p.startingLife ? STARTING(p.startingLife).effect.tafeFee : undefined) ?? C.tafeFee;
  }

  const uni: StudyOption = {
    ok: !studying && (level === 'entry' || level === 'skilled' || looking),
    fee: 0, hecs: false, canUseCard: false,
  };
  if (openDay) uni.freeBy = 'openDay';
  else if (familyHelp(p)) uni.freeBy = 'family';
  else uni.hecs = true;

  return { tafe, uni };
}

// ---------- Selling, cards, living ----------

/** What the Bank pays for a business: half of price plus Extra Sites paid, rounded up (DECISIONS.md). */
export function sellValue(g: Game, businessId: string): number {
  const h = g.holdings[businessId];
  const price = BUSINESS[businessId].price ?? h.price ?? 0;
  return half(price + h.sitesPaid);
}

export function canAddSite(g: Game, businessId: string): boolean {
  const b = BUSINESS[businessId];
  return b.extraSiteCost !== null && g.holdings[businessId].extraSites < C.maxExtraSites;
}

/** Cards that can be picked from a deck right now (hides held KEEP cards and laws in force). */
export function availableCards(g: Game, deck: 'news' | 'life' | 'market' | 'policy'): string[] {
  const held = new Set(g.players.flatMap((p) => p.keepCards));
  const laws = new Set(g.laws.map((l) => l.id));
  return DATA.cards[deck].filter((c) => !held.has(c.id) && !laws.has(c.id)).map((c) => c.id);
}

export function linked(indA: string, indB: string): boolean {
  return DATA.linkedIndustries.some(
    ([x, y]) => (x === indA && (y === indB || y === '*')) || (x === indB && (y === indA || y === '*')),
  );
}

export function livingCost(g: Game, p: Player): { base: number; adjust: number; total: number; gst: number } {
  const base = g.level === 1 ? C.livingCostsLevel1 : DATA.tracks.prices.livingCosts[String(g.prices)];
  const shareHouse = holdsCard(p, SHARE_HOUSE_CARD)
    ? (DATA.cards.life.find((c) => c.id === SHARE_HOUSE_CARD)!.effect[0] as { livingAdjust: number }).livingAdjust
    : 0;
  const adjust = shareHouse + lawSum(g, 'livingAdjust');
  return { base, adjust, total: Math.max(0, base + adjust), gst: lawSum(g, 'livingToTreasury') };
}

// ---------- News preview ----------

export interface AtRisk {
  playerId: string;
  why: 'recession' | 'card';
  needsRoll: boolean;
  dieLoseMax: number;
  canVolunteer: boolean;
}

/** What a News card will do to the economy and who needs a Job Risk check (for the UI to ask). */
export function newsPreview(g: Game, cardId: string) {
  const card = NEWS(cardId);
  let arrow = card.economy;
  if (g.level >= 2) {
    if ((g.interest === 'HIGH' || g.interest === 'VERY HIGH') && arrow > 0) arrow -= 1;
    if (g.interest === 'LOW' && arrow < 0) arrow += 1;
  }
  const from = g.economy;
  const to = ECON[Math.max(0, Math.min(ECON.length - 1, econIndex(from) + arrow))];
  const named = new Set(card.effect.flatMap((op) => (op.do === 'loseJob' ? op.jobs : [])));
  const atRisk: AtRisk[] = [];
  const intoRecession = to === ECON[0] && from !== ECON[0];
  for (const p of g.players) {
    if (!employed(p)) continue;
    const info = DATA.jobLevels[jobLevel(p)];
    const canVolunteer = holdsCard(p, VOLUNTEER_CARD);
    if (named.has(p.jobId)) atRisk.push({ playerId: p.id, why: 'card', needsRoll: false, dieLoseMax: info.dieLoseMax, canVolunteer });
    else if (intoRecession)
      atRisk.push({ playerId: p.id, why: 'recession', needsRoll: info.jobRisk !== 'always_lose', dieLoseMax: info.dieLoseMax, canVolunteer });
  }
  return { card, cardArrow: card.economy, arrow, from, to, atRisk };
}

/** True if a Job Risk roll loses the job for this player. */
export function rollLoses(p: Player, roll: number): boolean {
  return roll <= DATA.jobLevels[jobLevel(p)].dieLoseMax;
}

// ---------- Payday preview ----------

export function paydayNeeds(g: Game, pid: string) {
  const p = getPlayer(g, pid);
  const out: {
    upgrade?: { level: JobLevel; options: Job[] };
    studyFinish?: { level: JobLevel; options: Job[] };
    fortune?: { cashOver: number };
  } = {};
  if (p.pendingUpgrade && freeJobs(g, p.pendingUpgrade).length > 0)
    out.upgrade = { level: p.pendingUpgrade, options: freeJobs(g, p.pendingUpgrade) };
  if (p.jobStatus === 'studying' && p.study && p.study.tokensLeft === 1) {
    const options = freeJobs(g, p.study.target);
    if (options.length > 0) out.studyFinish = { level: p.study.target, options };
  }
  const threshold = lawParam(g, 'fortuneThreshold');
  if (threshold !== undefined && p.savings <= threshold) out.fortune = { cashOver: threshold - p.savings };
  return out;
}

// ---------- End of game ----------

export interface WorthLine {
  label: string;
  icon: string;
  amount: number;
  qty?: number;
}

/** Net worth itemised (SPEC 7.13). */
export function netWorth(g: Game, pid: string, cash: number): { lines: WorthLine[]; total: number } {
  const p = getPlayer(g, pid);
  const mult = C.businessMultiplierAtEnd[g.economy] ?? 1;
  const lines: WorthLine[] = [
    { label: 'Cash', icon: 'Q05', amount: cash },
    { label: 'Savings', icon: 'I06', amount: p.savings },
    { label: 'Super', icon: 'I09', amount: p.superBalance * C.superMultiplierAtEnd, qty: C.superMultiplierAtEnd },
  ];
  for (const h of owned(g, pid)) {
    const b = BUSINESS[h.businessId];
    lines.push({ label: b.name, icon: b.tile, amount: ((b.price ?? h.price ?? 0) + h.sitesPaid) * mult });
  }
  if (p.loans) lines.push({ label: 'Loans', icon: 'G01', amount: p.loans * C.loanValueAtEnd, qty: p.loans });
  if (p.hecs) lines.push({ label: 'HECS', icon: 'G03', amount: C.hecsValueAtEnd });
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

export const cardTitle = (id: string) => CARD[id]?.title ?? id;
