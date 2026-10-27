import { useState } from 'react';
import { Art, Btn, Sheet, Token } from '../ui/kit';
import { useStore } from '../store';
import './home.css';

export function Home({ onNew, onContinue }: { onNew: () => void; onContinue: () => void }) {
  const { game, actions } = useStore();
  const saved = actions.length > 0 && game.phase.name !== 'setup';
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="home">
      <Art id="X01" size="lg" className="home__bg" alt="" />
      <Art id="X02" size="lg" className="home__logo" alt="Boom & Bust" />
      <div className="home__buttons">
        <Btn tone="teal" big onClick={() => (saved ? setConfirm(true) : onNew())}>
          New game
        </Btn>
        {saved && (
          <Btn tone="navy" big onClick={onContinue}>
            Continue
            <span className="home__tokens">
              {game.players.map((p) => (
                <Token key={p.id} token={p.token} size={40} />
              ))}
            </span>
          </Btn>
        )}
      </div>
      {confirm && (
        <Sheet icon="C04" title="New game?" onClose={() => setConfirm(false)}
          footer={
            <>
              <Btn tone="ghost" onClick={() => setConfirm(false)}>No</Btn>
              <Btn tone="coral" onClick={onNew}>Yes</Btn>
            </>
          }>
          <div className="home__confirm">
            {game.players.map((p) => (
              <Token key={p.id} token={p.token} size={64} />
            ))}
            <span className="home__confirm-x" aria-hidden>✕</span>
          </div>
        </Sheet>
      )}
    </div>
  );
}
