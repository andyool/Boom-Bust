// The current player's turn: who it is, the one big next step, and the side actions.
import { JOB, SPACES, type Game, type Transfer } from '../engine';
import { store, useStore } from '../store';
import { Art, Btn, Token } from '../ui/kit';
import { SettleUp } from '../ui/money';
import { jobArt } from './PlayerSheet';
import './turn.css';

export type SideAction = 'loan' | 'repay' | 'sell' | 'trade' | 'savings' | 'deal' | 'cantPay' | 'record';

export interface MainButton {
  label: string;
  tone: 'teal' | 'mustard';
  token?: string;
  art?: string;
  onClick: () => void;
}

export function TurnPanel({
  game, main, last, onAction,
}: { game: Game; main: MainButton | null; last: Transfer[]; onAction: (a: SideAction) => void }) {
  const { actions } = useStore();
  const p = game.players[game.turnIndex];
  const space = SPACES[p.position];
  const side = (a: SideAction, label: string, icon: string, tone: 'ghost' | 'coral' = 'ghost') => (
    <Btn tone={tone} className="btn--side" onClick={() => onAction(a)}>
      <Art id={icon} alt="" />
      <span>{label}</span>
    </Btn>
  );

  return (
    <section className="turn">
      <div className="turn__who">
        <Token token={p.token} size={96} current />
        <div className="turn__id">
          <span className="turn__name">{p.name}</span>
          <span className="turn__cards">
            <Art id={jobArt(p)} alt={p.jobStatus === 'employed' ? JOB[p.jobId].name : p.jobStatus} />
            <Art id={space.tile} alt={space.label} className="turn__space" />
          </span>
        </div>
      </div>

      {main && (
        <Btn tone={main.tone} big wide className="turn__main" onClick={main.onClick}>
          {main.token && <Token token={main.token} size={60} />}
          {main.art && <Art id={main.art} className="turn__main-art" alt="" />}
          {main.label}
        </Btn>
      )}

      <div className="turn__grid">
        {side('loan', 'Loan', 'G01')}
        {side('repay', 'Repay', 'G01')}
        {side('sell', 'Sell', 'I06')}
        {side('trade', 'Trade', 'K06')}
        {game.level >= 2 && side('savings', 'Savings', 'I03')}
        {game.level >= 3 && side('deal', 'Deal', 'G05')}
        {side('cantPay', "Can't pay", 'G04', 'coral')}
      </div>
      {last.some((t) => t.amount > 0) && (
        <div className="turn__last">
          <span className="turn__last-label">Last</span>
          <SettleUp game={game} transfers={last} title={false} />
        </div>
      )}
      <div className="turn__foot">
        <Btn tone="navy" className="btn--side" disabled={actions.length <= 1} onClick={() => store.undo()}>
          <span className="btn__glyph" aria-hidden>↶</span>
          <span>Undo</span>
        </Btn>
        {side('record', 'Record', 'K01')}
      </div>
    </section>
  );
}
