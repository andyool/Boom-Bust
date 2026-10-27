// Right-hand panel: every player at a glance, then the current player's buttons.
import { owned, type Game, type Player } from '../engine';
import { store, useStore } from '../store';
import { Art, Btn, Chip, Token } from '../ui/kit';
import { PlayerChips } from './PlayerSheet';
import './side.css';

export type SideAction = 'roll' | 'loan' | 'repay' | 'sell' | 'trade' | 'savings' | 'deal' | 'cantPay' | 'record';

export function Side({ game, onPlayer, onAction }: { game: Game; onPlayer: (id: string) => void; onAction: (a: SideAction) => void }) {
  const { actions } = useStore();
  const cur = game.players[game.turnIndex];
  const compact = game.players.length > 4;
  const side = (a: SideAction, label: string, icon: string, tone: 'navy' | 'ghost' | 'coral' = 'ghost') => (
    <Btn tone={tone} className="btn--sm" onClick={() => onAction(a)}>
      <Art id={icon} alt="" />
      <span>{label}</span>
    </Btn>
  );

  return (
    <aside className="side">
      <header className="side__head">
        <Art id="X02" className="side__logo" alt="Boom & Bust" />
        <span className={`side__level side__level--${game.level} num`}>L{game.level}</span>
      </header>

      <ol className={`plist${compact ? ' plist--compact' : ''}`}>
        {game.players.map((p) => (
          <li key={p.id}>
            <PlayerRow game={game} p={p} current={p.id === cur.id} onTap={() => onPlayer(p.id)} />
          </li>
        ))}
      </ol>

      <section className="turn">
        <div className="turn__top">
          {game.phase.name === 'turn' && (
            <Btn tone="teal" big className="turn__roll" onClick={() => onAction('roll')}>
              <Token token={cur.token} size={52} />
              Roll
            </Btn>
          )}
          {side('cantPay', "Can't pay", 'G04', 'coral')}
        </div>
        <div className="turn__grid">
          {side('loan', 'Loan', 'G01')}
          {side('repay', 'Repay', 'G01')}
          {side('sell', 'Sell', 'I06')}
          {side('trade', 'Trade', 'K06')}
          {game.level >= 2 && side('savings', 'Savings', 'I03')}
          {game.level >= 3 && side('deal', 'Deal', 'G05')}
        </div>
        <div className="turn__grid turn__grid--foot">
          <Btn tone="navy" className="btn--sm" disabled={actions.length <= 1} onClick={() => store.undo()}>
            <span className="btn__glyph" aria-hidden>↶</span>
            <span>Undo</span>
          </Btn>
          {side('record', 'Record', 'K01')}
        </div>
      </section>
    </aside>
  );
}

function PlayerRow({ game, p, current, onTap }: { game: Game; p: Player; current: boolean; onTap: () => void }) {
  return (
    <button type="button" className={`prow${current ? ' prow--current' : ''}`} onClick={onTap} aria-label={p.name}>
      <Token token={p.token} size={48} current={current} />
      <span className="prow__main">
        <span className="prow__name">
          {p.name}
          {p.id === game.startPlayerId && <span className="prow__star" title="Start Player">★</span>}
        </span>
        <PlayerChips game={game} p={p} />
      </span>
      <span className="prow__biz">
        {owned(game, p.id).length > 0 && <Chip icon="K06" title="Businesses">{owned(game, p.id).length}</Chip>}
      </span>
    </button>
  );
}


