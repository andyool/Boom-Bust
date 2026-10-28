// One card per player: job, money papers, KEEP cards and the businesses they own, plus the two ways in:
// LANDED (their sheet of spaces and side actions) and PAYDAY.
import { BUSINESS, owned, type Game, type Player } from '../engine';
import { Art, Btn, Token } from '../ui/kit';
import { PlayerChips } from './PlayerSheet';
import './players.css';

export function Players({
  game, busy, paidId, onPlayer, onPayday, onBusiness,
}: {
  game: Game;
  busy: boolean; // a landing or Payday is open: finish it first
  paidId: string | null; // just had Payday, so a second tap is a mistake
  onPlayer: (id: string) => void;
  onPayday: (id: string) => void;
  onBusiness: (id: string) => void;
}) {
  const acting = busy ? game.players[game.turnIndex].id : null;
  return (
    <section className={`players players--${game.players.length}`}>
      {game.players.map((p) => (
        <PlayerCard key={p.id} game={game} p={p} current={p.id === acting} busy={busy} paid={p.id === paidId}
          onTap={() => onPlayer(p.id)} onPayday={() => onPayday(p.id)} onBusiness={onBusiness} />
      ))}
    </section>
  );
}

function PlayerCard({
  game, p, current, busy, paid, onTap, onPayday, onBusiness,
}: { game: Game; p: Player; current: boolean; busy: boolean; paid: boolean; onTap: () => void; onPayday: () => void; onBusiness: (id: string) => void }) {
  const biz = owned(game, p.id);
  return (
    <article className={`pcard${current ? ' pcard--current' : ''}`}>
      <button type="button" className="pcard__head" onClick={onTap} disabled={busy} aria-label={p.name}>
        <Token token={p.token} size={72} current={current} />
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
      <div className="pcard__go">
        <Btn tone="teal" className="pcard__btn" disabled={busy} onClick={onTap}>
          <Token token={p.token} size={40} />
          Landed
        </Btn>
        <Btn tone="mustard" className="pcard__btn" disabled={busy || paid} onClick={onPayday}>
          <Art id="C01" alt="" />
          Payday
        </Btn>
      </div>
    </article>
  );
}
