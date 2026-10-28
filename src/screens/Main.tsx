// The main screen of the companion: the table's state on top, a card per player, and a bar for Undo, the latest
// money and the Record. Students roll and move on the physical board (the board is the board) and only tap a
// player when something happens: a space with something to do, PAYDAY, or doubles while looking for work.
import { useEffect, useRef, useState } from 'react';
import { SPACES, type GameEvent, type Transfer } from '../engine';
import { store, useStore } from '../store';
import { Art, Btn, Sheet, Token, toast } from '../ui/kit';
import { MoneyPanel, SettleUp } from '../ui/money';
import { LandingSheet } from './flows/LandingSheet';
import { Happenings } from './flows/Happenings';
import { PaydaySheet } from './flows/PaydaySheet';
import { RecordSheet } from './flows/RecordSheet';
import { NewDealSheet, SavingsSheet } from './flows/ChoiceSheets';
import { LawsSheet } from './flows/LawFlow';
import { SideSheet, type SideKind } from './flows/SideSheets';
import { act } from './flows/common';
import { PlayerSheet, type SideAction } from './PlayerSheet';
import { Players } from './Players';
import { StatusBar } from './StatusBar';
import { TileSheet } from './TileSheet';
import { EndGame } from './EndGame';
import { TeacherMenu } from './TeacherMenu';
import { useTimeLeft } from './useClock';
import './main.css';

type Open =
  | { kind: 'business'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'side'; which: SideKind; playerId: string }
  | { kind: 'savings'; playerId: string }
  | { kind: 'deal'; playerId: string }
  | { kind: 'record' }
  | { kind: 'laws' }
  | { kind: 'teacher' }
  | { kind: 'end' }
  | null;

interface Result {
  art?: string;
  transfers: Transfer[];
  events: GameEvent[];
}

const NOTE_TOAST: Record<string, string> = { yours: 'Yours', rest: 'Rest', visit: 'Visit' };

export function Main() {
  const { game, actions, startedAt } = useStore();
  const last = actions[actions.length - 1];
  const timeLeft = useTimeLeft(startedAt, game.settings.timerMinutes);
  const [open, setOpen] = useState<Open>(null);
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const seen = useRef(actions.length);
  const close = () => setOpen(null);

  // After a forward action: show the Treasury check after Payday, then ask where the piece landed;
  // or a word for a quiet landing.
  useEffect(() => {
    const forward = actions.length > seen.current;
    seen.current = actions.length;
    if (!forward) return;
    const { transfers, events } = game.last;
    if (last?.type === 'paydayDone') {
      const tr = transfers.filter((t) => t.step === 'treasury');
      const built = events.find((e): e is Extract<GameEvent, { kind: 'project' }> => e.kind === 'project');
      if (tr.length) setResult({ art: built?.projectId, transfers: tr, events });
      if (game.lastPayday) setOpen({ kind: 'player', id: game.lastPayday.playerId });
    }
    const landed = events.find((e): e is Extract<GameEvent, { kind: 'landed' }> => e.kind === 'landed');
    if (landed?.note && NOTE_TOAST[landed.note]) toast(NOTE_TOAST[landed.note]);
  }, [actions.length, game.last, game.lastPayday, last]);

  // Timer ending: when time runs out, the round finishes and the game ends (SPEC 5.11).
  useEffect(() => {
    if (timeLeft === 0 && !game.flags.lastRound && game.phase.name !== 'over') store.dispatch({ type: 'lastRound' });
  }, [timeLeft, game.flags.lastRound, game.phase.name]);

  const phase = game.phase.name;
  const busy = phase === 'land' || phase === 'payday';
  const flowOpen = !open && !result && hiddenAt !== actions.length && busy;
  const paidId = last?.type === 'paydayDone' ? game.lastPayday?.playerId ?? null : null;

  // Closing a landing or Payday before anything is chosen drops it: the space was tapped by mistake.
  // Once under way it only hides, and the bar's button brings it back.
  const closeFlow = (back = false) => {
    const now = store.get().actions;
    const a = now[now.length - 1];
    if (a?.type === 'land' || a?.type === 'payday') {
      store.undo();
      if (back) setOpen({ kind: 'player', id: a.playerId });
    } else setHiddenAt(now.length);
  };

  const onAction = (playerId: string) => (a: SideAction) => {
    if (a === 'savings') return setOpen({ kind: 'savings', playerId });
    if (a === 'deal') return setOpen({ kind: 'deal', playerId });
    setOpen({ kind: 'side', which: a, playerId });
  };

  const acting = game.players[game.turnIndex];
  const lastMoney = last && !['setup', 'edit', 'next', 'setting'].includes(last.type) ? game.last.transfers : [];
  const start = game.players.find((p) => p.id === game.startPlayerId);

  return (
    <div className="main">
      <StatusBar game={game} timeLeft={timeLeft} onLaws={() => setOpen({ kind: 'laws' })} onTeacher={() => setOpen({ kind: 'teacher' })} />
      {phase === 'over' ? (
        <EndGame game={game} onRecord={() => setOpen({ kind: 'record' })} />
      ) : (
        <>
          <div className="main__body">
            <Players game={game} busy={busy} paidId={paidId} onPlayer={(id) => setOpen({ kind: 'player', id })}
              onPayday={(id) => act({ type: 'payday', playerId: id })} onBusiness={(id) => setOpen({ kind: 'business', id })} />
          </div>
          <footer className="bar">
            <Btn tone="navy" className="btn--side" disabled={actions.length <= 1} onClick={() => store.undo()}>
              <span className="btn__glyph" aria-hidden>↶</span>
              <span>Undo</span>
            </Btn>
            <div className="bar__mid">
              {busy && !flowOpen ? (
                <Btn tone="mustard" big wide onClick={() => (setHiddenAt(null), close())}>
                  <Token token={acting.token} size={56} />
                  <Art id={game.phase.name === 'land' ? SPACES[game.phase.pos].tile : 'C01'} className="bar__art" alt="" />
                  {phase === 'payday' ? 'Payday' : 'Open'}
                </Btn>
              ) : lastMoney.some((t) => t.amount > 0) ? (
                <>
                  <span className="bar__label">Last</span>
                  <SettleUp game={game} transfers={lastMoney} title={false} />
                </>
              ) : (
                <span className="bar__hint">Landed on something? Tap your piece.</span>
              )}
            </div>
            {game.flags.lastRound && (
              <Btn tone="coral" className="btn--side" onClick={() => setOpen({ kind: 'end' })}>
                <Art id="C03" alt="" />
                <span>End game</span>
              </Btn>
            )}
            <Btn tone="ghost" className="btn--side" onClick={() => setOpen({ kind: 'record' })}>
              <Art id="K01" alt="" />
              <span>Record</span>
            </Btn>
          </footer>
        </>
      )}

      {flowOpen && phase === 'land' && <LandingSheet game={game} onClose={() => closeFlow()} onBack={() => closeFlow(true)} />}
      {flowOpen && phase === 'payday' && <PaydaySheet game={game} onClose={() => closeFlow()} />}

      {open?.kind === 'business' && <TileSheet game={game} pos={SPACES.find((s) => s.businessId === open.id)!.pos} onClose={close} />}
      {open?.kind === 'player' && <PlayerSheet game={game} playerId={open.id} paid={paidId === open.id} onClose={close} onAction={onAction(open.id)} />}
      {open?.kind === 'side' && (
        <SideSheet game={game} kind={open.which} playerId={open.playerId} onClose={close} onOpen={(which, playerId) => setOpen({ kind: 'side', which, playerId })} />
      )}
      {open?.kind === 'savings' && <SavingsSheet game={game} playerId={open.playerId} onClose={close} />}
      {open?.kind === 'deal' && <NewDealSheet game={game} playerId={open.playerId} onClose={close} />}
      {open?.kind === 'record' && <RecordSheet game={game} onClose={close} />}
      {open?.kind === 'laws' && <LawsSheet game={game} onClose={close} />}
      {open?.kind === 'teacher' && <TeacherMenu game={game} onClose={close} onRecord={() => setOpen({ kind: 'record' })} />}

      {/* The app cannot see turns, so the table says when the last round is back to the Start Player. */}
      {open?.kind === 'end' && start && (
        <Sheet icon="C03" title="End game" onClose={close}
          footer={
            <>
              <Btn tone="ghost" big onClick={close}>No</Btn>
              <Btn tone="coral" big onClick={() => act({ type: 'endGame' }, close)}>Yes</Btn>
            </>
          }>
          <div className="end-ask">
            <Token token={start.token} size={120} />
            <span className="end-ask__q">Back to {start.name}<span className="pcard__star">★</span>?</span>
          </div>
        </Sheet>
      )}

      {result && (
        <Sheet icon="I04" title="Treasury" onClose={() => setResult(null)} footer={<Btn tone="teal" big onClick={() => setResult(null)}>Done</Btn>}>
          <div className="result">
            {result.art && <Art id={result.art} size="lg" className="result__art" alt="" />}
            <div className="flow-col">
              <Happenings game={game} events={result.events.filter((e) => e.kind === 'project' || e.kind === 'bondRepaid')} />
              <MoneyPanel game={game} transfers={result.transfers} />
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
