// The main screen: the mini board with the dashboard inside it, the players on the right,
// and the flow sheets for the current phase (opened after the token finishes walking).
import { useEffect, useRef, useState } from 'react';
import { SPACES, currentPlayer, type GameEvent, type Transfer } from '../engine';
import { store, useStore } from '../store';
import { Art, Btn, Sheet, toast } from '../ui/kit';
import { MoneyPanel } from '../ui/money';
import { Board } from './Board';
import { Dashboard } from './Dashboard';
import { DiceSheet } from './flows/DiceSheet';
import { LandingSheet } from './flows/LandingSheet';
import { Happenings, PaydaySheet } from './flows/PaydaySheet';
import { SideSheet, TilePicker, type SideKind } from './flows/SideSheets';
import { PlayerSheet } from './PlayerSheet';
import { Side, type SideAction } from './Side';
import { TileSheet } from './TileSheet';
import { useWalk } from './useWalk';
import './main.css';

type Open =
  | { kind: 'tile'; pos: number }
  | { kind: 'player'; id: string }
  | { kind: 'dice' }
  | { kind: 'wrong' }
  | { kind: 'side'; which: SideKind }
  | null;

interface Result {
  icon: string;
  art?: string;
  transfers: Transfer[];
  events: GameEvent[];
}

const NOTE_TOAST: Record<string, string> = { yours: 'Yours', rest: 'Rest', visit: 'Visit' };

export function Main() {
  const { game, actions } = useStore();
  const last = actions[actions.length - 1];
  const { shown, walking } = useWalk(game, last);
  const [open, setOpen] = useState<Open>(null);
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const seen = useRef(actions.length);
  const close = () => setOpen(null);

  // After an action: show the Treasury check after Payday, and a short word for quiet landings.
  useEffect(() => {
    if (actions.length === seen.current) return;
    seen.current = actions.length;
    const { transfers, events } = game.last;
    if (last?.type === 'paydayDone') {
      const tr = transfers.filter((t) => t.step === 'treasury');
      const built = events.find((e) => e.kind === 'project');
      if (tr.length) setResult({ icon: 'I04', art: built?.kind === 'project' ? built.projectId : undefined, transfers: tr, events });
    }
  }, [actions.length, game.last, last]);

  // A short word when a landing needs nothing (own business, Level 1 Parliament, Job Centre).
  const toasted = useRef(actions.length);
  useEffect(() => {
    if (walking) return;
    const forward = actions.length > toasted.current;
    toasted.current = actions.length;
    if (!forward) return;
    const landed = game.last.events.find((e): e is Extract<GameEvent, { kind: 'landed' }> => e.kind === 'landed');
    if (landed?.note && NOTE_TOAST[landed.note]) toast(NOTE_TOAST[landed.note]);
  }, [walking, actions.length, game.last]);

  const phase = game.phase.name;
  const flowOpen = !walking && !open && !result && hiddenAt !== actions.length && (phase === 'land' || phase === 'payday');
  const hide = () => setHiddenAt(actions.length);

  const onAction = (a: SideAction) => {
    if (a === 'roll') return setOpen({ kind: 'dice' });
    if (a === 'loan' || a === 'repay' || a === 'sell' || a === 'trade' || a === 'cantPay') return setOpen({ kind: 'side', which: a });
    toast(a === 'record' ? 'Record: stage 4' : `${a[0].toUpperCase()}${a.slice(1)}: stage 5`);
  };

  const cur = currentPlayer(game);
  const mainButton =
    phase === 'turn'
      ? { label: 'Roll', tone: 'teal' as const, token: cur.token, onClick: () => onAction('roll') }
      : phase === 'land'
        ? { label: 'Open', tone: 'mustard' as const, art: SPACES[game.phase.name === 'land' ? game.phase.pos : 0].tile, onClick: () => setHiddenAt(null), disabled: walking }
        : phase === 'payday'
          ? { label: 'Payday', tone: 'mustard' as const, art: 'C01', onClick: () => setHiddenAt(null), disabled: walking }
          : phase === 'after'
            ? { label: 'Next', tone: 'teal' as const, token: game.players[(game.turnIndex + 1) % game.players.length].token, onClick: () => store.dispatch({ type: 'next' }) }
            : null;

  return (
    <div className="main">
      <div className="main__board">
        <Board game={game} positions={shown} onTile={(pos) => setOpen({ kind: 'tile', pos })}>
          <Dashboard game={game} />
        </Board>
      </div>
      <Side game={game} main={mainButton} onPlayer={(id) => setOpen({ kind: 'player', id })} onAction={onAction} />

      {flowOpen && phase === 'land' && <LandingSheet game={game} onClose={hide} onWrongSpace={() => setOpen({ kind: 'wrong' })} />}
      {flowOpen && phase === 'payday' && <PaydaySheet game={game} onClose={hide} />}

      {open?.kind === 'tile' && <TileSheet game={game} pos={open.pos} onClose={close} />}
      {open?.kind === 'player' && <PlayerSheet game={game} playerId={open.id} onClose={close} />}
      {open?.kind === 'dice' && <DiceSheet game={game} onClose={close} />}
      {open?.kind === 'wrong' && <TilePicker game={game} onClose={close} />}
      {open?.kind === 'side' && <SideSheet game={game} kind={open.which} onClose={close} onOpen={(k) => setOpen({ kind: 'side', which: k })} />}

      {result && (
        <Sheet icon={result.icon} title="Treasury" onClose={() => setResult(null)}
          footer={<Btn tone="teal" big onClick={() => setResult(null)}>Done</Btn>}>
          <div className="result">
            {result.art && <Art id={result.art} size="lg" className="result__art" alt="" />}
            <div className="flow-col">
              <Happenings game={game} events={result.events.filter((e) => e.kind === 'project')} />
              <MoneyPanel game={game} transfers={result.transfers} />
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
