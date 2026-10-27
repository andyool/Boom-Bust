// Setup: one screen, step by step (SPEC 5.2). The Banker step previews the real setup action.
import { useMemo, useState } from 'react';
import { BUSINESS, C, DATA, initialGame, type Action, type Level } from '../engine';
import { store } from '../store';
import { Art, Btn, Money, Notes, Token, toast } from '../ui/kit';
import { LEVEL_NAME, TOKEN_NAME, TOKENS } from '../ui/labels';
import './setup.css';

type Step = 'level' | 'players' | 'life' | 'end' | 'banker';
interface Draft {
  token: string;
  name: string;
  jobId: string | null;
  startingLife: string | null;
}

const ENTRY_JOBS = DATA.jobs.filter((j) => j.level === 'entry').map((j) => j.id);
const LIFE_CARDS = [...new Set(DATA.startingLifeDeck)];
const copiesOf = (id: string) => DATA.startingLifeDeck.filter((x) => x === id).length;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = TOKENS.length;
const LEVEL_ART: Record<Level, string[]> = { 1: ['E03', 'J02', 'B03'], 2: ['I01', 'I03', 'I05'], 3: ['K05', 'G05', 'D09'] };

export function Setup({ onCancel, onStart }: { onCancel: () => void; onStart: () => void }) {
  const [level, setLevel] = useState<Level | null>(null);
  const [players, setPlayers] = useState<Draft[]>([]);
  const [endMode, setEndMode] = useState<'paydays' | 'timer'>('paydays');
  const [minutes, setMinutes] = useState(45);
  const [step, setStep] = useState<Step>('level');
  const [nudge, setNudge] = useState(0); // bumps to replay the shake on rows that still need a card

  const steps: Step[] = ['level', 'players', ...(level === 3 ? (['life'] as Step[]) : []), 'end', 'banker'];
  const at = steps.indexOf(step);

  const action: Extract<Action, { type: 'setup' }> | null = useMemo(() => {
    if (!level) return null;
    return {
      type: 'setup',
      level,
      players: players.map((p) => ({
        name: p.name.trim() || TOKEN_NAME[p.token],
        token: p.token,
        jobId: p.jobId ?? '',
        startingLife: level === 3 ? (p.startingLife ?? undefined) : undefined,
      })),
      // 0 turns the Payday ending off when the class plays to a timer.
      endPaydays: endMode === 'paydays' ? C.endGamePaydays : 0,
      timerMinutes: endMode === 'timer' ? minutes : undefined,
    };
  }, [level, players, endMode, minutes]);

  const ready: Record<Step, boolean> = {
    level: level !== null,
    players: players.length >= MIN_PLAYERS && players.every((p) => p.jobId),
    life: players.every((p) => p.startingLife),
    end: true,
    banker: true,
  };

  const update = (token: string, patch: Partial<Draft>) =>
    setPlayers((ps) => ps.map((p) => (p.token === token ? { ...p, ...patch } : p)));

  const toggleToken = (token: string) =>
    setPlayers((ps) =>
      ps.some((p) => p.token === token)
        ? ps.filter((p) => p.token !== token)
        : ps.length < MAX_PLAYERS
          ? [...ps, { token, name: '', jobId: null, startingLife: null }]
          : ps,
    );

  const start = () => {
    if (!action) return;
    const err = store.newGame(action);
    if (err) toast(err);
    else onStart();
  };

  return (
    <div className="setup">
      <header className="setup__head">
        <Art id="X02" className="setup__logo" alt="Boom & Bust" />
        <ol className="setup__dots" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s} className={i === at ? 'is-on' : i < at ? 'is-done' : ''} />
          ))}
        </ol>
        <Btn tone="ghost" onClick={onCancel} aria-label="Close">✕</Btn>
      </header>

      <main className="setup__body">
        {step === 'level' && (
          <section className="levels">
            {([1, 2, 3] as Level[]).map((n) => (
              <button key={n} type="button" className={`level level--${n}${level === n ? ' is-on' : ''}`} onClick={() => setLevel(n)}>
                <span className="level__num num">{n}</span>
                <span className="level__name">{LEVEL_NAME[n]}</span>
                <span className="level__art">
                  {LEVEL_ART[n].map((id) => (
                    <Art key={id} id={id} alt="" />
                  ))}
                </span>
              </button>
            ))}
          </section>
        )}

        {step === 'players' && (
          <section className="players-step">
            <div className={`token-pick${players.length < MIN_PLAYERS ? ` is-missing${nudgeClass(nudge)}` : ''}`}>
              {TOKENS.map((t) => {
                const i = players.findIndex((p) => p.token === t);
                return (
                  <button key={t} type="button" className={`token-pick__btn${i >= 0 ? ' is-on' : ''}`} onClick={() => toggleToken(t)}
                    aria-pressed={i >= 0} aria-label={TOKEN_NAME[t]}>
                    <Token token={t} size={76} />
                    {i >= 0 && <span className="token-pick__n num">{i === 0 ? '★' : i + 1}</span>}
                  </button>
                );
              })}
              <span className="token-pick__count num">
                {players.length < MIN_PLAYERS ? `${players.length}/${MIN_PLAYERS}+` : `${players.length}`}
              </span>
            </div>
            {players.map((p, i) => (
              <div key={p.token} className={`draft-row${p.jobId ? '' : ` is-missing${nudgeClass(nudge)}`}`}>
                <span className="draft-row__n num">{i === 0 ? '★' : i + 1}</span>
                <Token token={p.token} size={56} />
                <input
                  className="draft-row__name"
                  value={p.name}
                  placeholder={TOKEN_NAME[p.token]}
                  maxLength={14}
                  onChange={(e) => update(p.token, { name: e.target.value })}
                  aria-label="Name"
                />
                <div className="card-pick">
                  {!p.jobId && <span className="card-pick__hint">Job card</span>}
                  {ENTRY_JOBS.map((j) => {
                    const takenBy = players.find((q) => q.jobId === j && q.token !== p.token);
                    return (
                      <button key={j} type="button" disabled={!!takenBy}
                        className={`card-pick__card${p.jobId === j ? ' is-on' : ''}`}
                        onClick={() => update(p.token, { jobId: p.jobId === j ? null : j })} aria-label={j}>
                        <Art id={j} alt={DATA.jobs.find((x) => x.id === j)!.name} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {step === 'life' && (
          <section className="players-step">
            {players.map((p, i) => (
              <div key={p.token} className={`draft-row${p.startingLife ? '' : ` is-missing${nudgeClass(nudge)}`}`}>
                <span className="draft-row__n num">{i === 0 ? '★' : i + 1}</span>
                <Token token={p.token} size={56} />
                <span className="draft-row__label">{p.name.trim() || TOKEN_NAME[p.token]}</span>
                <div className="card-pick">
                  {!p.startingLife && <span className="card-pick__hint">Life card</span>}
                  {LIFE_CARDS.map((s) => {
                    const used = players.filter((q) => q.startingLife === s && q.token !== p.token).length;
                    return (
                      <button key={s} type="button" disabled={used >= copiesOf(s)}
                        className={`card-pick__card${p.startingLife === s ? ' is-on' : ''}`}
                        onClick={() => update(p.token, { startingLife: p.startingLife === s ? null : s })} aria-label={s}>
                        <Art id={s} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {step === 'end' && (
          <section className="ends">
            <button type="button" className={`end-opt${endMode === 'paydays' ? ' is-on' : ''}`} onClick={() => setEndMode('paydays')}>
              <Art id="C01" alt="" />
              <span className="end-opt__big num">{C.endGamePaydays}</span>
              <span className="end-opt__label">Paydays</span>
            </button>
            <div className={`end-opt${endMode === 'timer' ? ' is-on' : ''}`} onClick={() => setEndMode('timer')} role="button" tabIndex={0}>
              <span className="end-opt__clock" aria-hidden>⏱</span>
              <span className="end-opt__stepper">
                <Btn tone="ghost" onClick={(e) => (e.stopPropagation(), setEndMode('timer'), setMinutes((m) => Math.max(10, m - 5)))} aria-label="Less">−</Btn>
                <span className="end-opt__big num">{minutes}</span>
                <Btn tone="ghost" onClick={(e) => (e.stopPropagation(), setEndMode('timer'), setMinutes((m) => Math.min(120, m + 5)))} aria-label="More">+</Btn>
              </span>
              <span className="end-opt__label">Timer · min</span>
            </div>
          </section>
        )}

        {step === 'banker' && action && <Banker action={action} />}
      </main>

      <footer className="setup__foot">
        <Btn tone="ghost" onClick={() => (at > 0 ? setStep(steps[at - 1]) : onCancel())}>Back</Btn>
        {step === 'banker' ? (
          <Btn tone="green" big onClick={start}>Start</Btn>
        ) : (
          <Btn tone="teal" big className={ready[step] ? '' : 'is-waiting'} aria-disabled={!ready[step]}
            onClick={() => {
              if (ready[step]) return setStep(steps[at + 1]);
              setNudge((n) => n + 1);
              toast(missingMessage(step, players.length));
            }}>
            Next
          </Btn>
        )}
      </footer>
    </div>
  );
}

/** What the Banker hands out, worked out by the engine from the setup action. */
function Banker({ action }: { action: Extract<Action, { type: 'setup' }> }) {
  const g = store.preview(action, initialGame());
  if (!g) return <p className="setup__error">?</p>;
  const startOf = (id: string) => g.last.transfers.find((t) => t.to === id)?.amount ?? 0;
  return (
    <section className="banker">
      <div className="banker__row banker__row--treasury">
        <Art id="I04" className="banker__icon" alt="Treasury" />
        <span className="banker__label">Treasury</span>
        <Money amount={g.treasury} big plain />
        <Notes amount={g.treasury} force />
      </div>
      {g.players.map((p) => {
        const owns = Object.values(g.holdings).filter((h) => h.ownerId === p.id);
        return (
          <div key={p.id} className="banker__row">
            <Token token={p.token} size={64} current={p.id === g.startPlayerId} />
            <span className="banker__label">{p.name}</span>
            <Money amount={startOf(p.id)} big plain />
            <Notes amount={startOf(p.id)} force />
            {owns.map((h) => (
              <Art key={h.businessId} id={BUSINESS[h.businessId].tile} className="banker__tile" alt={BUSINESS[h.businessId].name} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

/** Alternates two class names so the shake animation replays on every tap of a not-ready NEXT. */
const nudgeClass = (n: number) => (n === 0 ? '' : n % 2 ? ' nudge-a' : ' nudge-b');

function missingMessage(step: Step, count: number): string {
  if (step === 'level') return 'Pick a level';
  if (step === 'players') return count < MIN_PLAYERS ? `Tap ${MIN_PLAYERS}+ tokens` : 'Tap a job card for each player';
  if (step === 'life') return 'Tap a Life card for each player';
  return '';
}
