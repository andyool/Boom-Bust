// Money instructions: itemised lines, a total, and Settle up arrows with the note helper (SPEC 8).
import { getPlayer, netFor, settleUp, type Game, type Transfer } from '../engine';
import { Art, Money, Notes, Token } from './kit';
import './money.css';

/** A party in a transfer: a player's token, the Bank, Treasury, or a player's Super or Savings. */
export function Party({ game, party, size = 44 }: { game: Game; party: string; size?: number }) {
  if (party === 'bank') return <Art id="I06" className="party" style={{ width: size, height: size }} alt="Bank" />;
  if (party === 'treasury') return <Art id="I04" className="party" style={{ width: size, height: size }} alt="Treasury" />;
  const [kind, id] = party.includes(':') ? party.split(':') : ['player', party];
  const p = getPlayer(game, id);
  if (kind === 'player') return <Token token={p.token} size={size} />;
  return (
    <span className="party party--pile" style={{ width: size, height: size }}>
      <Art id={kind === 'super' ? 'I09' : 'I03'} alt={kind === 'super' ? 'Super' : 'Savings'} />
      <Token token={p.token} size={Math.round(size * 0.5)} className="party__owner" />
    </span>
  );
}

/** One row per transfer: icon, 1-3 words, who pays whom, the signed amount for `focus`. */
export function Lines({
  game, transfers, focus, total = true, notes = false,
}: { game: Game; transfers: Transfer[]; focus?: string; total?: boolean; notes?: boolean }) {
  if (!transfers.length) return null;
  const signed = (t: Transfer) => (!focus ? t.amount : t.to === focus ? t.amount : t.from === focus ? -t.amount : null);
  return (
    <div className="lines">
      {transfers.map((t, i) => {
        const s = signed(t);
        return (
          <div key={i} className="line">
            <Art id={t.icon} className="line__icon" alt="" />
            <span className="line__label">
              {t.label}
              {t.qty !== undefined && t.qty !== 1 && t.each !== undefined && (
                <small className="num">
                  {t.qty} × ${t.each}
                </small>
              )}
            </span>
            <span className="line__who">
              <Party game={game} party={t.from} size={34} />
              <span className="line__arrow" aria-hidden>→</span>
              <Party game={game} party={t.to} size={34} />
            </span>
            {s === null ? <Money amount={t.amount} plain /> : <Money amount={s} plain={!focus} />}
            {notes && (
              <span className="line__notes">
                <Notes amount={t.amount} />
              </span>
            )}
          </div>
        );
      })}
      {focus && total && transfers.length > 1 && (
        <div className="line line--total">
          <span className="line__label">Total</span>
          <Money amount={netFor(transfers.filter((t) => t.from === focus || t.to === focus), focus)} big />
        </div>
      )}
    </div>
  );
}

/** Netted arrows: one per pair of parties, each with the paper notes to hand over. */
export function SettleUp({ game, transfers, title = true }: { game: Game; transfers: Transfer[]; title?: boolean }) {
  const arrows = settleUp(transfers);
  if (!arrows.length) return null;
  return (
    <div className="settle">
      {title && <h3 className="settle__title">Settle up</h3>}
      {arrows.map((a, i) => (
        <div key={i} className="settle__row">
          <Party game={game} party={a.from} size={56} />
          <span className="settle__arrow">
            <span className="num">${a.amount}</span>
          </span>
          <Party game={game} party={a.to} size={56} />
          <Notes amount={a.amount} />
        </div>
      ))}
    </div>
  );
}

/** Lines plus Settle up. When nothing nets, each line carries its own notes instead. */
export function MoneyPanel({ game, transfers, focus }: { game: Game; transfers: Transfer[]; focus?: string }) {
  const real = transfers.filter((t) => t.from !== t.to);
  if (!real.length) return null;
  const paying = real.filter((t) => t.amount > 0);
  if (settleUp(real).length === paying.length) {
    return (
      <div className="money-panel">
        <Lines game={game} transfers={real} focus={focus} notes />
      </div>
    );
  }
  return (
    <div className="money-panel money-panel--two">
      <Lines game={game} transfers={real} focus={focus} />
      <SettleUp game={game} transfers={real} />
    </div>
  );
}
