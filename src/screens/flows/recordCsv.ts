// The Record as CSV (SPEC 5.10 SHARE). No React, so it can be unit-tested.
import { getPlayer, type Game } from '../../engine';

const HEAD = ['payday', 'player', 'news', 'economy', 'prices', 'wages', 'interest', 'out_of_work', 'treasury', 'bonds', 'projects_built'];

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function recordCsv(game: Game): string {
  const rows = game.record.map((r) =>
    [r.n, getPlayer(game, r.playerId).name, r.newsCard, r.economy, r.prices, r.wages, r.interest, r.outOfWork, r.treasury, r.bonds, r.projectsBuilt]
      .map(esc)
      .join(','),
  );
  return [HEAD.join(','), ...rows].join('\n') + '\n';
}
