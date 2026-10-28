// A player's sheet: tap the space your piece landed on, or a side action. Students roll and move on the
// real board and only come here when something happens; spaces with nothing to do are greyed out.
import { JOB, SPACES, getPlayer, landingNote, type Action, type Game, type Player } from '../engine';
import { Pips } from '../ui/inputs';
import { Art, Btn, Chip, Sheet, Token, toast } from '../ui/kit';
import { act } from './flows/common';
import './sheets.css';

export type SideAction = 'loan' | 'repay' | 'sell' | 'trade' | 'savings' | 'deal' | 'cantPay';

/** The job card a player shows: their card, the "looking for work" back, or the Study token. */
export function jobArt(p: Player) {
  if (p.jobStatus === 'looking') return 'K07';
  if (p.jobStatus === 'studying') return 'I08';
  return p.jobId;
}

export function PlayerChips({ game, p }: { game: Game; p: Player }) {
  return (
    <span className="pchips">
      <Art id={jobArt(p)} className="pchips__job" alt={p.jobStatus === 'employed' ? JOB[p.jobId].name : p.jobStatus} />
      {p.study && <b className="num pchips__study">{p.study.tokensLeft}</b>}
      {p.loans > 0 && <Chip icon="G01" title="Loans">×{p.loans}</Chip>}
      {p.hecs && <Chip icon="G03" title="HECS" />}
      {p.superBalance > 0 && <Chip icon="I09" title="Super">${p.superBalance}</Chip>}
      {game.level >= 2 && p.savings > 0 && <Chip icon="I03" title="Savings">${p.savings}</Chip>}
      {p.bankruptTokens > 0 && <Chip icon="G04" title="Bankrupt">{p.bankruptTokens}</Chip>}
      {p.keepCards.map((c) => (
        <Art key={c} id={c} className="pchips__keep" alt={c} />
      ))}
    </span>
  );
}

export function PlayerSheet({
  game, playerId, paid, onClose, onAction,
}: { game: Game; playerId: string; paid: boolean; onClose: () => void; onAction: (a: SideAction) => void }) {
  const p = getPlayer(game, playerId);
  // The landing or Payday sheet opens as soon as the report is in.
  const report = (a: Action) => act(a, onClose);
  const side = (a: SideAction, label: string, icon: string, tone: 'ghost' | 'coral' = 'ghost') => (
    <Btn tone={tone} className="btn--side" onClick={() => onAction(a)}>
      <Art id={icon} alt="" />
      <span>{label}</span>
    </Btn>
  );

  return (
    <Sheet title={<span className="flow-title"><Token token={p.token} size={56} />{p.name}<PlayerChips game={game} p={p} /></span>} onClose={onClose}>
      <div className="psheet">
        <div className="where" role="group" aria-label="Landed on">
          {SPACES.map((s) => {
            const payday = s.kind === 'payday';
            const owner = s.businessId ? game.holdings[s.businessId].ownerId : null;
            return (
              <button key={s.pos} type="button" aria-label={s.label}
                className={`where__tile${s.side === 'corner' ? ' is-corner' : ''}${payday ? ' where__tile--payday' : ''}`}
                disabled={payday ? paid : landingNote(game, p, s.pos) !== undefined}
                onClick={() => report(payday ? { type: 'payday', playerId: p.id } : { type: 'land', playerId: p.id, pos: s.pos })}>
                <Art id={s.tile} alt="" />
                {owner && <Token token={getPlayer(game, owner).token} size={30} className="where__owner" />}
              </button>
            );
          })}
        </div>
        <div className="psheet__side">
          {p.jobStatus === 'looking' && (
            <Btn tone="mustard" className="btn--side psheet__doubles" onClick={() => act({ type: 'doubles', playerId: p.id }, () => toast('Got job'))}>
              <span className="dice-pair">
                <Pips value={4} />
                <Pips value={4} />
              </span>
              <span>Doubles</span>
            </Btn>
          )}
          {side('loan', 'Loan', 'G01')}
          {side('repay', 'Repay', 'G01')}
          {side('sell', 'Sell', 'I06')}
          {side('trade', 'Trade', 'K06')}
          {game.level >= 2 && side('savings', 'Savings', 'I03')}
          {game.level >= 3 && side('deal', 'Deal', 'G05')}
          {side('cantPay', "Can't pay", 'G04', 'coral')}
        </div>
      </div>
    </Sheet>
  );
}
