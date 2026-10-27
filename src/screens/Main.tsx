// The main screen of the companion: the table's state on top, the current turn on the left,
// the players on the right, and the flow sheets for the current phase. The physical board is the board.
import { useEffect, useRef, useState } from 'react';
import { SPACES, currentPlayer, type GameEvent, type Transfer } from '../engine';
import { store, useStore } from '../store';
import { Art, Btn, Sheet, toast } from '../ui/kit';
import { MoneyPanel } from '../ui/money';
import { DiceSheet } from './flows/DiceSheet';
import { LandingSheet } from './flows/LandingSheet';
import { Happenings } from './flows/Happenings';
import { PaydaySheet } from './flows/PaydaySheet';
import { RecordSheet } from './flows/RecordSheet';
import { NewDealSheet, SavingsSheet } from './flows/ChoiceSheets';
import { LawsSheet } from './flows/LawFlow';
import { SideSheet, TilePicker, type SideKind } from './flows/SideSheets';
import { PlayerSheet } from './PlayerSheet';
import { Players } from './Players';
import { StatusBar } from './StatusBar';
import { TileSheet } from './TileSheet';
import { TurnPanel, type MainButton, type SideAction } from './TurnPanel';
import { EndGame } from './EndGame';
import { TeacherMenu } from './TeacherMenu';
import { useTimeLeft } from './useClock';
import './main.css';

type Open =
  | { kind: 'business'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'dice' }
  | { kind: 'wrong' }
  | { kind: 'side'; which: SideKind }
  | { kind: 'savings' }
  | { kind: 'record' }
  | { kind: 'deal' }
  | { kind: 'laws' }
  | { kind: 'teacher' }
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

  // After a forward action: show the Treasury check after Payday, or a word for a quiet landing.
  useEffect(() => {
    const forward = actions.length > seen.current;
    seen.current = actions.length;
    if (!forward) return;
    const { transfers, events } = game.last;
    if (last?.type === 'paydayDone') {
      const tr = transfers.filter((t) => t.step === 'treasury');
      const built = events.find((e): e is Extract<GameEvent, { kind: 'project' }> => e.kind === 'project');
      if (tr.length) setResult({ art: built?.projectId, transfers: tr, events });
    }
    const landed = events.find((e): e is Extract<GameEvent, { kind: 'landed' }> => e.kind === 'landed');
    if (landed?.note && NOTE_TOAST[landed.note]) toast(NOTE_TOAST[landed.note]);
  }, [actions.length, game.last, last]);

  // Timer ending: when time runs out, the round finishes and the game ends (SPEC 5.11).
  useEffect(() => {
    if (timeLeft === 0 && !game.flags.lastRound && game.phase.name !== 'over') store.dispatch({ type: 'lastRound' });
  }, [timeLeft, game.flags.lastRound, game.phase.name]);

  const phase = game.phase.name;
  const flowOpen = !open && !result && hiddenAt !== actions.length && (phase === 'land' || phase === 'payday');
  const hide = () => setHiddenAt(actions.length);

  const onAction = (a: SideAction) => {
    if (a === 'record') return setOpen({ kind: 'record' });
    if (a === 'savings') return setOpen({ kind: 'savings' });
    if (a === 'deal') return setOpen({ kind: 'deal' });
    setOpen({ kind: 'side', which: a });
  };

  const next = game.players[(game.turnIndex + 1) % game.players.length];
  const main: MainButton | null =
    phase === 'turn'
      ? { label: 'Roll', tone: 'teal', token: currentPlayer(game).token, onClick: () => setOpen({ kind: 'dice' }) }
      : game.phase.name === 'land'
        ? { label: 'Open', tone: 'mustard', art: SPACES[game.phase.pos].tile, onClick: () => setHiddenAt(null) }
        : phase === 'payday'
          ? { label: 'Payday', tone: 'mustard', art: 'C01', onClick: () => setHiddenAt(null) }
          : phase === 'after'
            ? { label: 'Next', tone: 'teal', token: next.token, onClick: () => store.dispatch({ type: 'next' }) }
            : null;

  return (
    <div className="main">
      <StatusBar game={game} timeLeft={timeLeft} onLaws={() => setOpen({ kind: 'laws' })} onTeacher={() => setOpen({ kind: 'teacher' })} />
      {phase === 'over' ? (
        <EndGame game={game} onRecord={() => setOpen({ kind: 'record' })} />
      ) : (
        <div className="main__body">
          <TurnPanel game={game} main={main} last={last && !['setup', 'edit', 'next', 'setting'].includes(last.type) ? game.last.transfers : []} onAction={onAction} />
          <Players game={game} onPlayer={(id) => setOpen({ kind: 'player', id })} onBusiness={(id) => setOpen({ kind: 'business', id })} />
        </div>
      )}

      {flowOpen && phase === 'land' && <LandingSheet game={game} onClose={hide} onWrongSpace={() => setOpen({ kind: 'wrong' })} />}
      {flowOpen && phase === 'payday' && <PaydaySheet game={game} onClose={hide} />}

      {open?.kind === 'business' && <TileSheet game={game} pos={SPACES.find((s) => s.businessId === open.id)!.pos} onClose={close} />}
      {open?.kind === 'player' && <PlayerSheet game={game} playerId={open.id} onClose={close} />}
      {open?.kind === 'dice' && <DiceSheet game={game} onClose={close} />}
      {open?.kind === 'wrong' && <TilePicker game={game} onClose={close} />}
      {open?.kind === 'side' && <SideSheet game={game} kind={open.which} onClose={close} onOpen={(k) => setOpen({ kind: 'side', which: k })} />}
      {open?.kind === 'savings' && <SavingsSheet game={game} playerId={currentPlayer(game).id} onClose={close} />}
      {open?.kind === 'record' && <RecordSheet game={game} onClose={close} />}
      {open?.kind === 'deal' && <NewDealSheet game={game} onClose={close} />}
      {open?.kind === 'laws' && <LawsSheet game={game} onClose={close} />}
      {open?.kind === 'teacher' && <TeacherMenu game={game} onClose={close} onRecord={() => setOpen({ kind: 'record' })} />}

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
