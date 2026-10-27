// Typed access to game-data.json. Every game number comes from here; never retype one.
import raw from '../../game-data.json';

export type Econ = 'RECESSION' | 'SLOW' | 'STEADY' | 'GROWTH' | 'BOOM';
export type Rate = 'LOW' | 'NORMAL' | 'HIGH' | 'VERY HIGH';
export type JobLevel = 'entry' | 'skilled' | 'professional';
export type Clip = 'budget' | 'standard' | 'premium' | 'monopoly';
export type IndustryKind = 'customer' | 'employer' | 'transport' | 'utility';
export type SpaceKind =
  | 'payday' | 'business' | 'utility' | 'life' | 'market' | 'tax_time' | 'open_day'
  | 'job_centre' | 'parliament' | 'job_cut' | 'super_fund';
export type Deck = 'news' | 'life' | 'market' | 'policy' | 'startingLife';

export interface Industry {
  name: string;
  sector: string;
  colour: string;
  kind: IndustryKind;
  shiftPay?: number;
  shiftPayIfOwnsAll?: number;
  perTransportOwned?: number;
  bill?: number;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  price: number | null;
  customerPrices: Record<Clip, number> | null;
  profit: Record<Econ, number>;
  extraSiteCost: number | null;
  tile: string;
  deed: string;
}

export interface Space {
  pos: number;
  tile: string;
  kind: SpaceKind;
  businessId?: string;
  label: string;
  side: 'corner' | 'bottom' | 'right' | 'top' | 'left';
}

export interface Job {
  id: string;
  name: string;
  level: JobLevel;
  card: string;
}

export interface JobLevelInfo {
  pay: number;
  tax: number;
  takeHome: number;
  jobRisk: string;
  dieLoseMax: number;
}

/** Multiplies an amount by the businesses a player owns that match. */
export interface Per {
  all?: boolean;
  industries?: string[];
  businesses?: string[];
  except?: string[];
}

export type Cond = 'employed' | 'employedEntry' | 'employedSkilledUp' | 'ownsAnyBusiness' | { ownsAnyIn: string[] };

export interface MoneyOp {
  do: 'pay' | 'collect';
  who: 'drawer' | 'each' | 'others' | 'ownerOf';
  amount: number;
  with: 'bank' | 'treasury' | 'drawer';
  per?: Per;
  business?: string;
  if?: Cond;
  ask?: string;
  unlessKeep?: string;
  lawAmount?: Record<string, number>;
}

export type Op =
  | MoneyOp
  | { do: 'buildProject' }
  | { do: 'setFlag'; flag: 'noNewLoans' }
  | { do: 'superLoss'; amount: number }
  | { do: 'loseJob'; jobs: string[] }
  | { do: 'regainJob'; levels: JobLevel[] }
  | { do: 'treasuryToBank'; amount: number }
  | {
      do: 'keep';
      saveJob?: boolean;
      livingAdjust?: number;
      freeTafe?: boolean;
      ask?: string;
      cost?: number;
      with?: 'bank';
      cancels?: string[];
    }
  | { do: 'discountSite'; fraction: number }
  | { do: 'bargain'; fraction: number }
  | { do: 'supplyBonus'; amount: number; with: 'bank' }
  | { do: 'monopolyFine'; amount: number; with: 'treasury'; level3ForceStandard: boolean }
  | { do: 'auctionUtilities'; businesses: string[] };

export interface LawParams {
  entryTakeHomeBonus?: number;
  takeHomeBonus?: number;
  taxCut?: number;
  companyTaxPerBusiness?: number;
  tafeFee?: number;
  jobSeeker?: number;
  livingToTreasury?: number;
  livingAdjust?: number;
  customerPriceCut?: number;
  capIndustries?: string[];
  capBusinesses?: string[];
  level3Clip?: Clip;
  fortuneThreshold?: number;
  fortuneTax?: number;
  redTape?: boolean;
}

export interface PolicyEffect {
  law?: LawParams;
  payday?: MoneyOp[];
  oneOff?: Op[];
}

export interface StartingEffect {
  startCash: number;
  freeFirstCourse?: boolean;
  tafeFee?: number;
  owns?: string[];
  takeHomeAdjust?: number;
}

interface CardBase {
  id: string;
  deck: string;
  title: string;
  image: string;
  level: number;
  text: string;
  logic: string;
  inputs?: string[];
  keep?: boolean;
}
export interface NewsCard extends CardBase {
  economy: number;
  level2?: { prices?: number; wages?: number };
  effect: Op[];
}
export interface ActionCard extends CardBase {
  effect: Op[];
}
export interface PolicyCard extends CardBase {
  isLaw: boolean;
  effect: PolicyEffect;
}
export interface StartingCard extends CardBase {
  effect: StartingEffect;
}
export type AnyCard = NewsCard | ActionCard | PolicyCard | StartingCard;

interface Constants {
  startCash: number;
  treasuryStart: number;
  livingCostsLevel1: number;
  loanSize: number;
  loanInterestLevel1: number;
  hecsPerPayday: number;
  jobSeeker: number;
  studyAllowance: number;
  tafeFee: number;
  tafeTokens: number;
  uniTokens: number;
  superFundEmployer: number;
  superFundOwnMax: number;
  superFundStep: number;
  companyTaxPerBusiness: number;
  utilityBill: number;
  projectCost: number;
  projectBuildThreshold: number;
  projectPaysPerPlayer: number;
  bondSize: number;
  bondInterestLevel2: number;
  maxExtraSites: number;
  sellToBankFraction: number;
  bankruptTokens: number;
  cartelFine: number;
  supplyDealPerPayday: number;
  maxSupplyDealsPerPlayer: number;
  supplyDealCards: number;
  endGamePaydays: number;
  superMultiplierAtEnd: number;
  loanValueAtEnd: number;
  hecsValueAtEnd: number;
  businessMultiplierAtEnd: Partial<Record<Econ, number>>;
  auctionMinBid: number;
  utilityAuctionMinBid: number;
  maxLaws: number;
  debateSeconds: number;
  notes: number[];
  savingsBlock: number;
  economyStart: Econ;
}

export interface GameData {
  economy: { key: Econ; icon: string }[];
  industries: Record<string, Industry>;
  linkedIndustries: [string, string][];
  businesses: Business[];
  spaces: Space[];
  jobLevels: Record<JobLevel, JobLevelInfo>;
  jobs: Job[];
  tracks: {
    prices: {
      level: number;
      icon: string;
      positions: number[];
      start: number;
      livingCosts: Record<string, number>;
      customerPriceBonusFrom: number;
      customerPriceBonus: number;
    };
    wages: { level: number; icon: string; positions: number[]; start: number; takeHomeBonusPerStep: number };
    interest: {
      level: number;
      icon: string;
      positions: Rate[];
      start: Rate;
      loanInterest: Record<Rate, number>;
      savingsInterestPer200: Record<Rate, number>;
    };
  };
  projects: { order: number; id: string; name: string; tile: string }[];
  constants: Constants;
  cards: {
    news: NewsCard[];
    life: ActionCard[];
    market: ActionCard[];
    policy: PolicyCard[];
    startingLife: StartingCard[];
  };
  smallCards: { id: string; name: string; copies: number; level?: number }[];
  cardBacks: Record<string, string>;
  startingLifeDeck: string[];
}

export const DATA = raw as unknown as GameData;
export const C = DATA.constants;

export const ECON: Econ[] = DATA.economy.map((e) => e.key);
export const RATES: Rate[] = DATA.tracks.interest.positions;
export const BOARD_SIZE = DATA.spaces.length;

export const BUSINESS: Record<string, Business> = Object.fromEntries(DATA.businesses.map((b) => [b.id, b]));
export const INDUSTRY: Record<string, Industry> = DATA.industries;
export const JOB: Record<string, Job> = Object.fromEntries(DATA.jobs.map((j) => [j.id, j]));
export const SPACES: Space[] = DATA.spaces;

const allCards: AnyCard[] = [
  ...DATA.cards.news,
  ...DATA.cards.life,
  ...DATA.cards.market,
  ...DATA.cards.policy,
  ...DATA.cards.startingLife,
];
export const CARD: Record<string, AnyCard> = Object.fromEntries(allCards.map((c) => [c.id, c]));
export const NEWS = (id: string) => need(DATA.cards.news.find((c) => c.id === id), `News card ${id}`);
export const POLICY = (id: string) => need(DATA.cards.policy.find((c) => c.id === id), `Policy card ${id}`);
export const STARTING = (id: string) => need(DATA.cards.startingLife.find((c) => c.id === id), `Starting Life card ${id}`);
export const ACTION_CARD = (id: string) =>
  need([...DATA.cards.life, ...DATA.cards.market].find((c) => c.id === id), `Life/Market card ${id}`);

export const businessesIn = (industry: string) => DATA.businesses.filter((b) => b.industry === industry);
export const spaceOf = (businessId: string) => need(SPACES.find((s) => s.businessId === businessId), businessId);

function need<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new Error(`Unknown ${what}`);
  return x;
}
