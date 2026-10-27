// Dice sheet (SPEC 5.3): tap one face in each row, then GO. Doubles are spotted automatically.
import { useState } from 'react';
import { BOARD_SIZE, SPACES, currentPlayer, type Game } from '../../engine';
import { store } from '../../store';
import { DieRow } from '../../ui/inputs';
import { Art, Btn, Sheet, Token, toast } from '../../ui/kit';
import './flows.css';

export function DiceSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const p = currentPlayer(game);
  const [d1, setD1] = useState<number | null>(null);
  const [d2, setD2] = useState<number | null>(null);
  const both = d1 !== null && d2 !== null;
  const doubles = both && d1 === d2;
  const gotJob = doubles && p.jobStatus === 'looking';
  const to = both ? (p.position + d1 + d2) % BOARD_SIZE : null;
  const passes = both && p.position + d1 + d2 >= BOARD_SIZE;

  const go = () => {
    if (!both) return;
    const err = store.dispatch({ type: 'roll', d1, d2 });
    if (err) toast(err);
    else onClose();
  };

  return (
    <Sheet
      title={<span className="flow-title"><Token token={p.token} size={56} current />{p.name}</span>}
      onClose={onClose}
      footer={<Btn tone="teal" big disabled={!both} onClick={go}>Go</Btn>}
    >
      <div className="dice">
        <div className="dice__rows">
          <DieRow value={d1} onPick={setD1} size={96} />
          <DieRow value={d2} onPick={setD2} size={96} />
        </div>
        <div className="dice__out">
          {both && <span className="dice__sum num">{d1 + d2}</span>}
          {doubles && <span className="tag tag--mustard">Doubles</span>}
          {gotJob && (
            <span className="dice__job">
              <Art id="K07" alt="Looking for work" />
              <span className="dice__flip" aria-hidden>→</span>
              <Art id={p.jobId} alt="Got job" />
              <span className="tag tag--green">Got job</span>
            </span>
          )}
          {to !== null && (
            <span className="dice__to">
              {passes && <Art id="C01" className="dice__payday" alt="Payday" />}
              <Art id={SPACES[to].tile} className="dice__tile" alt={SPACES[to].label} />
            </span>
          )}
        </div>
      </div>
    </Sheet>
  );
}
