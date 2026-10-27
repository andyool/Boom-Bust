import type { Clip, Econ, JobLevel, Rate } from './data';

export type { Clip, Econ, JobLevel, Rate };
export type JobStatus = 'employed' | 'looking' | 'studying';
export type Level = 1 | 2 | 3;

export interface Player {
  id: string;
  name: string;
  token: string; // T01-T06
  position: number; // 0-39
  jobId: string; // J01-J18 card held
  jobStatus: JobStatus;
  study?: { kind: 'tafe' | 'uni'; tokensLeft: number; target: 'skilled' | 'professional' };
  pendingUpgrade?: 'skilled' | 'professional'; // finished study, no card free yet
  loans: number;
  hecs: boolean;
  superBalance: number;
  savings: number;
  bankruptTokens: number; // 0-3
  keepCards: string[]; // L12, L13, L15, L19
  startingLife?: string;
  startCash: number;
  freeCourseUsed: boolean; // S01
  paydays: number;
}

export interface Holding {
  businessId: string;
  ownerId: string | null;
  extraSites: number; // 0-2
  sitesPaid: number; // total $ paid for its Extra Sites
  priceClip: Clip; // Level 3
  forcedStandardUntilPaydayOf?: string; // M16 at Level 3
  price?: number; // utilities sold by P10: the auction price
}

export interface SupplyDeal {
  a: string;
  aBiz: string;
  b: string;
  bBiz: string;
}

export interface RecordRow {
  n: number; // Payday number across the whole game
  playerId: string;
  playerPayday: number; // that player's own Payday count
  newsCard: string;
  economy: Econ;
  prices: number | null;
  wages: number | null;
  interest: Rate | null;
  outOfWork: number;
  treasury: number;
  bonds: number;
  projectsBuilt: number;
}

/** A party that money can move between. Player ids are plain strings. */
export type Party = string; // 'bank' | 'treasury' | playerId | `super:${id}` | `savings:${id}`

export type Step =
  | 'setup' | 'news' | 'income' | 'profit' | 'projects' | 'living' | 'debts' | 'choices'
  | 'treasury' | 'land' | 'card' | 'action' | 'parliament' | 'end';

export interface Transfer {
  from: Party;
  to: Party;
  amount: number; // never negative; the direction carries the sign
  label: string; // 1-3 words
  icon: string; // asset ID
  step?: Step;
}

export type GameEvent =
  | { kind: 'economy'; from: Econ; to: Econ; cardArrow: number; arrow: number }
  | { kind: 'track'; track: 'prices' | 'wages' | 'interest'; from: number | Rate; to: number | Rate; why: string }
  | { kind: 'lostJob'; playerId: string; why: 'recession' | 'jobCut' | 'card'; roll?: number }
  | { kind: 'keptJob'; playerId: string; why: 'recession' | 'jobCut' | 'card'; roll?: number; volunteer?: boolean }
  | { kind: 'gotJob'; playerId: string; why: 'doubles' | 'economy' | 'card' | 'study' }
  | { kind: 'newJob'; playerId: string; jobId: string; oldJobId: string }
  | { kind: 'studyStep'; playerId: string; tokensLeft: number }
  | { kind: 'studyDone'; playerId: string; waiting: boolean }
  | { kind: 'enrolled'; playerId: string; course: 'tafe' | 'uni'; fee: number; hecs: boolean; freeBy?: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'bond'; bonds: number }
  | { kind: 'bondRepaid'; bonds: number }
  | { kind: 'flag'; flag: 'noNewLoans'; on: boolean }
  | { kind: 'move'; playerId: string; from: number; to: number; steps: number; passedPayday: boolean }
  | { kind: 'landed'; playerId: string; pos: number; note?: 'yours' | 'rest' | 'visit' | 'payday' }
  | { kind: 'owner'; businessId: string; ownerId: string | null; how: string }
  | { kind: 'site'; businessId: string; sites: number }
  | { kind: 'keepCard'; playerId: string; cardId: string; on: boolean }
  | { kind: 'law'; cardId: string; on: boolean }
  | { kind: 'vote'; cardId: string; passed: boolean }
  | { kind: 'bankrupt'; playerId: string }
  | { kind: 'bankruptToken'; playerId: string; left: number }
  | { kind: 'deal'; deal: SupplyDeal; on: boolean }
  | { kind: 'clip'; businessId: string; clip: Clip }
  | { kind: 'card'; cardId: string; playerId: string }
  | { kind: 'cheapestIsYours'; playerId: string; businessId: string }
  | { kind: 'lastRound' }
  | { kind: 'gameOver' }
  | { kind: 'turn'; playerId: string };

export interface PaydayPhase {
  name: 'payday';
  step: 'news' | 'settle' | 'choices';
  playerId: string;
  resumeTo: number; // where the move finishes after Payday
  newsCard?: string;
  lines: Transfer[]; // everything this Payday so far, for the itemised screen
  events: GameEvent[];
}

export type Phase =
  | { name: 'setup' }
  | { name: 'turn' } // waiting for ROLL
  | PaydayPhase
  | { name: 'land'; pos: number } // landing sheet open
  | { name: 'after' } // landed; side actions; NEXT
  | { name: 'over' };

export interface Game {
  level: Level;
  players: Player[];
  startPlayerId: string;
  turnIndex: number;
  economy: Econ;
  prices: number;
  wages: number;
  interest: Rate;
  treasury: number;
  bonds: number;
  projectsBuilt: number; // 0-5
  holdings: Record<string, Holding>; // every business incl. utilities
  laws: { id: string; passedAt: number }[]; // max 3
  supplyDeals: SupplyDeal[];
  flags: { noNewLoans: boolean; rbaMode: boolean; lastRound: boolean };
  record: RecordRow[];
  settings: { noteHelper: boolean; endPaydays: number; timerMinutes?: number }; // endPaydays 0: the game ends by timer only
  phase: Phase;
  seq: number; // increases with every law passed; used for passedAt
  finalCash: Record<string, number>; // end game: counted cash per player
  lastPayday?: { playerId: string; newsCard?: string; lines: Transfer[]; events: GameEvent[] }; // the latest finished Payday
  last: { transfers: Transfer[]; events: GameEvent[] }; // result of the latest action
}

export type RiskInput = { roll?: number; volunteer?: boolean };

export interface SetupPlayer {
  name?: string;
  token: string;
  jobId: string;
  startingLife?: string;
}

export type Action =
  // setup and turn flow
  | { type: 'setup'; level: Level; players: SetupPlayer[]; endPaydays?: number; timerMinutes?: number }
  | { type: 'roll'; d1: number; d2: number }
  | { type: 'moveTo'; pos: number; passPayday?: boolean }
  | { type: 'next' }
  // Payday
  | { type: 'news'; cardId: string; jobRisk?: Record<string, RiskInput> }
  | { type: 'paydaySettle'; newJobId?: string; upgradeJobId?: string; fortune?: boolean }
  | { type: 'paydayDone' }
  | { type: 'addSite'; businessId: string }
  | { type: 'study'; course: 'tafe' | 'uni'; useL15?: boolean }
  | { type: 'setClip'; businessId: string; clip: Clip }
  | { type: 'cancelDeal'; index: number }
  // landing
  | { type: 'buy' }
  | { type: 'pass' }
  | { type: 'auction'; winnerId: string; bid: number }
  | { type: 'payRent'; payeeId?: string }
  | { type: 'drawCard'; cardId: string; answer?: boolean; businessId?: string; otherId?: string }
  | { type: 'taxTime' }
  | { type: 'openDay'; course: 'tafe' | 'uni' | null }
  | { type: 'superFund'; own: number }
  | { type: 'jobCut'; roll?: number; volunteer?: boolean }
  | { type: 'parliament'; cardId: string; passed: boolean; removeLawId?: string; auctions?: AuctionResult[] }
  // side actions (any time; playerId defaults to the current player)
  | { type: 'loan'; playerId?: string }
  | { type: 'repay'; playerId?: string }
  | { type: 'sell'; businessId: string }
  | { type: 'trade'; businessId: string; toPlayerId: string }
  | { type: 'savings'; playerId?: string; amount: number } // + in, - out, in savingsBlock steps
  | { type: 'deal'; a: string; aBiz: string; b: string; bBiz: string }
  | { type: 'bankrupt'; playerId: string }
  // end and teacher
  | { type: 'lastRound' }
  | { type: 'endGame' }
  | { type: 'finalCash'; playerId: string; cash: number }
  | { type: 'budgetNight'; cardId: string; removeLawId?: string; auctions?: AuctionResult[] }
  | { type: 'accc'; playerIds: string[] }
  | { type: 'setting'; noteHelper?: boolean; rbaMode?: boolean }
  | { type: 'edit'; edits: Edit[] };

export interface AuctionResult {
  businessId: string;
  winnerId: string | null;
  bid: number;
}

export type Edit =
  | { target: 'game'; field: 'economy' | 'prices' | 'wages' | 'interest' | 'treasury' | 'bonds' | 'projectsBuilt'; value: number | string }
  | {
      target: 'player';
      playerId: string;
      field: 'position' | 'loans' | 'hecs' | 'superBalance' | 'savings' | 'bankruptTokens' | 'jobId' | 'jobStatus' | 'name' | 'paydays' | 'keepCards';
      value: number | string | boolean | string[];
    }
  | { target: 'holding'; businessId: string; field: 'ownerId' | 'extraSites' | 'sitesPaid' | 'priceClip'; value: number | string | null }
  | { target: 'law'; cardId: string; on: boolean };
