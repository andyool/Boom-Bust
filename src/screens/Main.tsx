// The main screen: the mini board with the dashboard inside it, and the players on the right.
import { useState } from 'react';
import { useGame } from '../store';
import { toast } from '../ui/kit';
import { Board } from './Board';
import { Dashboard } from './Dashboard';
import { PlayerSheet } from './PlayerSheet';
import { Side, type SideAction } from './Side';
import { TileSheet } from './TileSheet';
import './main.css';

type Open = { kind: 'tile'; pos: number } | { kind: 'player'; id: string } | null;

export function Main() {
  const game = useGame();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  const onAction = (a: SideAction) => {
    // Turn flows and side actions arrive in stage 3.
    toast(`${a === 'cantPay' ? "Can't pay" : a[0].toUpperCase() + a.slice(1)}: stage 3`);
  };

  return (
    <div className="main">
      <div className="main__board">
        <Board game={game} onTile={(pos) => setOpen({ kind: 'tile', pos })}>
          <Dashboard game={game} />
        </Board>
      </div>
      <Side game={game} onPlayer={(id) => setOpen({ kind: 'player', id })} onAction={onAction} />
      {open?.kind === 'tile' && <TileSheet game={game} pos={open.pos} onClose={close} />}
      {open?.kind === 'player' && <PlayerSheet game={game} playerId={open.id} onClose={close} />}
    </div>
  );
}
