// One card per player: job, money papers, KEEP cards and the businesses they own.
import { BUSINESS, owned, type Game, type Player } from '../engine';
import { Art, Token } from '../ui/kit';
import { PlayerChips } from './PlayerSheet';
import './players.css';

export function Players({ game, onPlayer, onBusiness }: { game: Game; onPlayer: (id: string) => void; onBusiness: (id: string) => void }) {
  const cur = game.players[game.turnIndex];
  return (
    <section className={`players players--${game.players.length > 3 ? 'grid' : 'list'}`}>
      {game.players.map((p) => (
        <PlayerCard key={p.id} game={game} p={p} current={p.id === cur.id} onTap={() => onPlayer(p.id)} onBusiness={onBusiness} />
      ))}
    </section>
  );
}

function PlayerCard({ game, p, current, onTap, onBusiness }: { game: Game; p: Player; current: boolean; onTap: () => void; onBusiness: (id: string) => void }) {
  const biz = owned(game, p.id);
  return (
    <article className={`pcard${current ? ' pcard--current' : ''}`}>
      <button type="button" className="pcard__head" onClick={onTap} aria-label={p.name}>
        <Token token={p.token} size={64} current={current} />
        <span className="pcard__name">
          {p.name}
          {p.id === game.startPlayerId && <span className="pcard__star" title="Start Player">★</span>}
        </span>
        <PlayerChips game={game} p={p} />
      </button>
      <div className="pcard__biz">
        {biz.map((h) => {
          const b = BUSINESS[h.businessId];
          return (
            <button key={h.businessId} type="button" className="pcard__tile" onClick={() => onBusiness(h.businessId)} aria-label={b.name}>
              <Art id={b.tile} alt="" />
              {h.extraSites > 0 && (
                <span className="pcard__sites">
                  {Array.from({ length: h.extraSites }, (_, i) => (
                    <Art key={i} id="I07" alt="" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}
