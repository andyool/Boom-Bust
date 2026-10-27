// The working context for one action: it mutates a draft game and records every transfer.
import { BUSINESS, C, DATA } from './data';
import { getPlayer, fail } from './helpers';
import type { Game, GameEvent, Party, Step, Transfer } from './types';

export class Ctx {
  transfers: Transfer[] = [];
  events: GameEvent[] = [];
  step: Step = 'action';

  constructor(public g: Game) {}

  /** Moves money and records it. Treasury borrows Bonds first if it is short (SPEC 7.1). */
  move(from: Party, to: Party, amount: number, label: string, icon: string, extra?: { qty?: number; each?: number }) {
    if (amount < 0) fail(`Negative transfer ${amount}`);
    if (from === 'treasury' && amount > 0) this.ensureTreasury(amount);
    this.adjust(from, -amount);
    this.adjust(to, amount);
    this.transfers.push({ from, to, amount, label, icon, step: this.step, ...extra });
  }

  /** Bank pays the player when positive, the player pays the Bank when negative. */
  bankSigned(pid: string, amount: number, label: string, icon: string, extra?: { qty?: number; each?: number }) {
    if (amount >= 0) this.move('bank', pid, amount, label, icon, extra);
    else this.move(pid, 'bank', -amount, label, icon, extra);
  }

  private ensureTreasury(amount: number) {
    while (this.g.treasury < amount) {
      this.g.bonds += 1;
      this.adjust('treasury', C.bondSize);
      this.transfers.push({ from: 'bank', to: 'treasury', amount: C.bondSize, label: 'Bond', icon: 'G02', step: this.step });
      this.events.push({ kind: 'bond', bonds: this.g.bonds });
    }
  }

  private adjust(party: Party, delta: number) {
    if (party === 'treasury') this.g.treasury += delta;
    else if (party.startsWith('super:')) getPlayer(this.g, party.slice(6)).superBalance += delta;
    else if (party.startsWith('savings:')) getPlayer(this.g, party.slice(8)).savings += delta;
    // The Bank and players' cash are physical: the app does not track them.
  }

  event(e: GameEvent) {
    this.events.push(e);
  }

  /** Treasury builds the next Public Project if any are left (N06, P06, Treasury check). */
  buildProject(): boolean {
    const g = this.g;
    if (g.projectsBuilt >= DATA.projects.length) return false;
    const project = DATA.projects[g.projectsBuilt];
    this.move('treasury', 'bank', C.projectCost, 'Project', project.tile);
    g.projectsBuilt += 1;
    this.event({ kind: 'project', projectId: project.id });
    return true;
  }

  /** Sets a business's owner and resets what does not carry over. */
  setOwner(businessId: string, ownerId: string | null, how: string, keepSites = false) {
    const h = this.g.holdings[businessId];
    h.ownerId = ownerId;
    h.priceClip = 'standard';
    delete h.forcedStandardUntilPaydayOf;
    if (!keepSites || ownerId === null) {
      h.extraSites = 0;
      h.sitesPaid = 0;
    }
    if (ownerId === null) delete h.price;
    this.endDealsFor(businessId);
    this.event({ kind: 'owner', businessId, ownerId, how });
  }

  /** A Supply Deal ends when either business is sold or lost (SPEC 7.14). */
  endDealsFor(businessId: string) {
    const g = this.g;
    const ending = g.supplyDeals.filter((d) => d.aBiz === businessId || d.bBiz === businessId);
    if (!ending.length) return;
    g.supplyDeals = g.supplyDeals.filter((d) => !ending.includes(d));
    for (const deal of ending) this.event({ kind: 'deal', deal, on: false });
  }

  tile(businessId: string) {
    return BUSINESS[businessId].tile;
  }
}
