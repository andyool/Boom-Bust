// End of the game (SPEC 5.11): count cash, net worth itemised, a podium, then a class-talk panel.
import { useState } from 'react';
import { C, DATA, netWorth, type Game } from '../engine';
import { act } from './flows/common';
import { NumberPad } from '../ui/inputs';
import { Art, Btn, Money, Token, econIcon } from '../ui/kit';
import { NOTE_ART } from '../ui/labels';
import './endgame.css';

export function EndGame({ game, onRecord }: { game: Game; onRecord: () => void }) {
  const missing = game.players.filter((p) => game.finalCash[p.id] === undefined);
  const [editing, setEditing] = useState<string | null>(null);
  const who = editing ?? missing[0]?.id ?? null;
  if (who) return <CashEntry key={who} game={game} playerId={who} onDone={() => setEditing(null)} onPick={setEditing} />;
  return <Results game={game} onRecord={onRecord} onEdit={setEditing} />;
}

function CashEntry({ game, playerId, onDone, onPick }: { game: Game; playerId: string; onDone: () => void; onPick: (id: string) => void }) {
  const [cash, setCash] = useState(game.finalCash[playerId] ?? 0);
  const p = game.players.find((x) => x.id === playerId)!;
  return (
    <section className="end end--cash">
      <div className="end__who">
        {game.players.map((x) => (
          <button key={x.id} type="button" className={`end__pick${x.id === playerId ? ' is-on' : ''}`} onClick={() => onPick(x.id)}>
            <Token token={x.token} size={64} />
            {game.finalCash[x.id] !== undefined && <span className="end__tick" aria-label="Counted">✓</span>}
          </button>
        ))}
      </div>
      <div className="end__cash">
        <div className="end__cash-head">
          <Token token={p.token} size={120} current />
          <span className="end__name">{p.name}</span>
          <span className="end__notes">
            {C.notes.map((n) => (
              <Art key={n} id={NOTE_ART[n]} alt={`$${n}`} />
            ))}
          </span>
        </div>
        <NumberPad value={cash} onChange={setCash} />
        <Btn tone="green" big onClick={() => act({ type: 'finalCash', playerId, cash }, onDone)}>OK</Btn>
      </div>
    </section>
  );
}

function Results({ game, onRecord, onEdit }: { game: Game; onRecord: () => void; onEdit: (id: string) => void }) {
  const rows = game.players
    .map((p) => ({ p, worth: netWorth(game, p.id, game.finalCash[p.id] ?? 0) }))
    .sort((a, b) => b.worth.total - a.worth.total);
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean);
  const richest = rows[0];
  const poorest = rows[rows.length - 1];
  const looking = game.players.filter((p) => p.jobStatus === 'looking');
  const mult = C.businessMultiplierAtEnd[game.economy] ?? 1;

  return (
    <section className="end end--results">
      <div className="end__left">
        <div className="podium">
          {podium.map((r) => {
            const place = rows.indexOf(r) + 1;
            return (
              <div key={r.p.id} className={`podium__spot podium__spot--${place}`}>
                <Token token={r.p.token} size={place === 1 ? 104 : 80} current={place === 1} />
                <span className="podium__name">{r.p.name}</span>
                <Money amount={r.worth.total} plain big={place === 1} />
                <span className="podium__block num">{place}</span>
              </div>
            );
          })}
        </div>

        <div className="talk">
          <div className="talk__item">
            <span className="talk__pair">
              <Token token={richest.p.token} size={44} />
              <span aria-hidden>↔</span>
              <Token token={poorest.p.token} size={44} />
            </span>
            <span className="talk__label">Gap</span>
            <Money amount={richest.worth.total - poorest.worth.total} plain big />
          </div>
          <div className="talk__item">
            <Art id="K07" alt="" className="talk__icon" />
            <span className="talk__label">Out of work</span>
            <span className="talk__tokens">
              {looking.length ? looking.map((p) => <Token key={p.id} token={p.token} size={36} />) : <b className="num">0</b>}
            </span>
          </div>
          <div className="talk__item">
            <span className="talk__label">Projects</span>
            <span className="talk__pp">
              {DATA.projects.map((pp, i) => (
                <Art key={pp.id} id={pp.tile} alt={pp.name} className={i < game.projectsBuilt ? 'is-built' : ''} />
              ))}
            </span>
          </div>
          <div className="talk__item">
            <Art id="G02" alt="" className="talk__icon" />
            <span className="talk__label">Bonds</span>
            <b className="num">×{game.bonds}</b>
            <Money amount={game.bonds * C.bondSize} plain />
          </div>
          <div className="talk__item">
            <Art id={econIcon(game.economy)} alt={game.economy} className="talk__icon" />
            <span className="talk__label">Business ×{mult}</span>
          </div>
          <Btn tone="teal" big wide onClick={onRecord}>
            <Art id="K01" alt="" />
            Record
          </Btn>
        </div>
      </div>

      <div className="worths">
        {rows.map((r, i) => (
          <article key={r.p.id} className="worth">
            <header className="worth__head">
              <span className="worth__place num">{i + 1}</span>
              <Token token={r.p.token} size={48} />
              <span className="worth__name">{r.p.name}</span>
              <button type="button" className="link-btn" onClick={() => onEdit(r.p.id)}>Cash</button>
            </header>
            <div className="worth__lines">
              {r.worth.lines
                .filter((l) => l.amount !== 0 || l.label === 'Cash')
                .map((l, k) => (
                  <span key={k} className="worth__line">
                    <Art id={l.icon} alt="" />
                    <span className="worth__label">{l.label}</span>
                    {l.qty !== undefined && l.qty !== 1 && <small className="num">×{l.qty}</small>}
                    <Money amount={l.amount} />
                  </span>
                ))}
            </div>
            <footer className="worth__total">
              <span>Total</span>
              <Money amount={r.worth.total} big plain />
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
