// Payday (SPEC 5.5), laid out like the player mat ("MY PAYDAY"): seven numbered steps,
// each filling in as it resolves, Settle up after step 6, Choices, then DONE.
import { useState } from 'react';
import {
  NEWS, getPlayer, newsPreview, paydayNeeds, rollLoses, tryApply, type Game, type GameEvent, type RiskInput, type Step, type Transfer,
} from '../../engine';
import { DieRow } from '../../ui/inputs';
import { Art, Btn, Money, Notes, Sheet, Token } from '../../ui/kit';
import { Party, SettleUp } from '../../ui/money';
import { CardPicker, DECK_BACK } from './CardPicker';
import { SiteSheet, StudySheet, SavingsSheet, ClipsSheet, DealsSheet } from './ChoiceSheets';
import { EconomyMove, Happenings } from './Happenings';
import { SideSheet } from './SideSheets';
import { YesNo, act } from './common';
import { jobArt } from '../PlayerSheet';
import './payday.css';

type Sub = 'news' | 'site' | 'study' | 'loan' | 'repay' | 'savings' | 'clips' | 'deals' | null;

const ROWS: { n: number; step: Step; label: string; icon?: string }[] = [
  { n: 1, step: 'news', label: 'News', icon: DECK_BACK.news },
  { n: 2, step: 'income', label: 'Income' },
  { n: 3, step: 'profit', label: 'Profit', icon: 'K06' },
  { n: 4, step: 'projects', label: 'Projects', icon: 'PP1' },
  { n: 5, step: 'living', label: 'Living', icon: 'I01' },
  { n: 6, step: 'debts', label: 'Debts', icon: 'G01' },
  { n: 7, step: 'choices', label: 'Choices', icon: 'I07' },
];
const SETTLE_STEPS: Step[] = ['income', 'profit', 'projects', 'living', 'debts'];

export function PaydaySheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [sub, setSub] = useState<Sub>(null);
  const [newJob, setNewJob] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [fortune, setFortune] = useState<boolean | undefined>();
  if (game.phase.name !== 'payday') return null;
  const ph = game.phase;
  const p = getPlayer(game, ph.playerId);
  const needs = ph.step === 'settle' ? paydayNeeds(game, p.id) : {};
  const settleReady = (!needs.studyFinish || newJob) && (!needs.fortune || fortune !== undefined);
  const state = (n: number) =>
    ph.step === 'news' ? (n === 1 ? 'active' : 'todo') : ph.step === 'settle' ? (n === 1 ? 'done' : n < 7 ? 'active' : 'todo') : n < 7 ? 'done' : 'active';
  const linesOf = (step: Step) => ph.lines.filter((l) => l.step === step);
  const settleLines = ph.lines.filter((l) => SETTLE_STEPS.includes(l.step!));
  const l2 = game.level >= 2;
  const l3 = game.level >= 3;
  const closeSub = () => setSub(null);

  const settle = () =>
    act({
      type: 'paydaySettle',
      ...(newJob ? { newJobId: newJob } : {}),
      ...(upgrade ? { upgradeJobId: upgrade } : {}),
      ...(fortune !== undefined ? { fortune } : {}),
    });

  return (
    <>
      <Sheet
        title={
          <span className="flow-title">
            <Token token={p.token} size={52} current />
            <Art id="C01" className="flow-title__tile" alt="" />
            My Payday
            <span className="mat__count num">#{p.paydays + 1}</span>
          </span>
        }
        onClose={onClose}
      >
        <div className="mat">
          <ol className="mat__steps">
            {ROWS.map((r, i) => (
              <li key={r.n} className={`mat__row is-${state(r.n)}`} style={{ '--i': i } as React.CSSProperties}>
                <span className="mat__n num">{r.n}</span>
                <Art id={r.step === 'income' ? jobArt(p) : r.icon!} className="mat__icon" alt="" />
                <span className="mat__label">{r.label}</span>
                <div className="mat__body">
                  {r.step === 'news' && ph.newsCard && (
                    <div className="mat__news">
                      <Art id={ph.newsCard} className="mat__card" alt={NEWS(ph.newsCard).title} />
                      <div className="mat__news-out">
                        <Happenings game={game} events={newsEvents(ph.events, ph.newsEvents)} />
                        <Chips game={game} lines={linesOf('news')} focus={p.id} parties />
                      </div>
                    </div>
                  )}
                  {state(r.n) === 'done' && r.step !== 'news' && r.step !== 'choices' && <Chips game={game} lines={linesOf(r.step)} focus={p.id} />}
                  {r.step === 'income' && state(2) === 'done' && (
                    <Happenings game={game} economy={false}
                      events={ph.events.filter((e) => 'playerId' in e && e.playerId === p.id && (e.kind === 'studyStep' || e.kind === 'newJob' || (e.kind === 'gotJob' && e.why === 'study')))} />
                  )}
                  {r.step === 'debts' && state(6) === 'done' && (
                    <Happenings game={game} events={ph.events.filter((e) => e.kind === 'bankruptToken')} economy={false} />
                  )}
                  {r.step === 'income' && needs.studyFinish && (
                    <JobPick ids={needs.studyFinish.options.map((j) => j.id)} value={newJob} onPick={setNewJob} lead="I08" />
                  )}
                  {r.step === 'income' && needs.upgrade && (
                    <JobPick ids={needs.upgrade.options.map((j) => j.id)} value={upgrade} onPick={(id) => setUpgrade(upgrade === id ? null : id)} lead={p.jobId} />
                  )}
                  {r.step === 'debts' && needs.fortune && (
                    <span className="mat__ask">
                      <Art id="P14" alt="" />
                      <span className="num">Cash &gt; ${needs.fortune.cashOver}?</span>
                      <YesNo value={fortune} onPick={setFortune} />
                    </span>
                  )}
                  {r.step === 'choices' && state(7) === 'active' && (
                    <div className="mat__choices">
                      <Btn tone="ghost" className="btn--side" onClick={() => setSub('site')}><Art id="I07" alt="" /><span>+ Site</span></Btn>
                      <Btn tone="ghost" className="btn--side" onClick={() => setSub('study')}><Art id="I08" alt="" /><span>Study</span></Btn>
                      <Btn tone="ghost" className="btn--side" onClick={() => setSub('loan')}><Art id="G01" alt="" /><span>Loan</span></Btn>
                      <Btn tone="ghost" className="btn--side" onClick={() => setSub('repay')}><Art id="G01" alt="" /><span>Repay</span></Btn>
                      {l2 && <Btn tone="ghost" className="btn--side" onClick={() => setSub('savings')}><Art id="I03" alt="" /><span>Savings</span></Btn>}
                      {l3 && <Btn tone="ghost" className="btn--side" onClick={() => setSub('clips')}><Art id="D09" alt="" /><span>Prices</span></Btn>}
                      {l3 && <Btn tone="ghost" className="btn--side" onClick={() => setSub('deals')}><Art id="G05" alt="" /><span>Deals</span></Btn>}
                      <Chips game={game} lines={linesOf('choices')} focus={p.id} />
                    </div>
                  )}
                </div>
                {state(r.n) === 'done' && r.step !== 'news' && <Subtotal lines={linesOf(r.step)} focus={p.id} />}
                {r.step === 'choices' && state(7) === 'active' && linesOf('choices').length > 0 && <Subtotal lines={linesOf('choices')} focus={p.id} />}
              </li>
            ))}
          </ol>

          <aside className="mat__side">
            {ph.step === 'news' && (
              <button type="button" className="mat__deck" onClick={() => setSub('news')} aria-label="News">
                <Art id={DECK_BACK.news} size="lg" alt="" />
                <span className="btn btn--teal btn--big">News</span>
              </button>
            )}
            {ph.step === 'settle' && (
              <Btn tone="teal" big wide disabled={!settleReady} onClick={settle}>Next</Btn>
            )}
            {ph.step === 'choices' && (
              <>
                <TotalBox lines={settleLines} focus={p.id} />
                <SettleUp game={game} transfers={settleLines} />
                <Btn tone="teal" big wide className="mat__done" onClick={() => act({ type: 'paydayDone' })}>Done</Btn>
              </>
            )}
          </aside>
        </div>
      </Sheet>

      {sub === 'news' && <NewsPicker game={game} onClose={closeSub} />}
      {sub === 'site' && <SiteSheet game={game} playerId={p.id} onClose={closeSub} />}
      {sub === 'study' && <StudySheet game={game} playerId={p.id} onClose={closeSub} />}
      {(sub === 'loan' || sub === 'repay') && <SideSheet game={game} kind={sub} playerId={p.id} onClose={closeSub} onOpen={() => {}} />}
      {sub === 'savings' && <SavingsSheet game={game} playerId={p.id} onClose={closeSub} />}
      {sub === 'clips' && <ClipsSheet game={game} playerId={p.id} onClose={closeSub} />}
      {sub === 'deals' && <DealsSheet game={game} playerId={p.id} onClose={closeSub} />}
    </>
  );
}

/** What the News card did (step 1), without bookkeeping events. */
function newsEvents(events: GameEvent[], count = 0): GameEvent[] {
  return events.slice(0, count).filter((e) => e.kind !== 'card');
}

/** A step's lines as compact chips: picture, qty x each, signed amount (and who, for News). */
function Chips({ game, lines, focus, parties }: { game: Game; lines: Transfer[]; focus: string; parties?: boolean }) {
  if (!lines.length) return null;
  return (
    <div className="chips">
      {lines.map((l, i) => {
        const mine = l.to === focus || l.from === focus;
        const signed = l.to === focus ? l.amount : -l.amount;
        return (
          <span key={i} className={`chipline${mine ? '' : ' chipline--other'}`}>
            <Art id={l.icon} alt="" />
            <span className="chipline__label">{l.label}</span>
            {l.qty !== undefined && l.qty !== 1 && l.each !== undefined && <small className="num">{l.qty}×${l.each}</small>}
            {(parties || !mine) && (
              <span className="chipline__who">
                <Party game={game} party={l.from} size={26} />
                <span aria-hidden>→</span>
                <Party game={game} party={l.to} size={26} />
              </span>
            )}
            {mine ? <Money amount={signed} /> : <Money amount={l.amount} plain />}
          </span>
        );
      })}
    </div>
  );
}

function Subtotal({ lines, focus }: { lines: Transfer[]; focus: string }) {
  const net = lines.reduce((s, l) => s + (l.to === focus ? l.amount : l.from === focus ? -l.amount : 0), 0);
  return (
    <span className="mat__sub">
      <Money amount={net} />
    </span>
  );
}

function TotalBox({ lines, focus }: { lines: Transfer[]; focus: string }) {
  const net = lines.reduce((s, l) => s + (l.to === focus ? l.amount : l.from === focus ? -l.amount : 0), 0);
  return (
    <div className="mat__total">
      <span className="mat__total-label">Total</span>
      <Money amount={net} big />
      <Notes amount={Math.abs(net)} />
    </div>
  );
}

function JobPick({ ids, value, onPick, lead }: { ids: string[]; value: string | null; onPick: (id: string) => void; lead: string }) {
  return (
    <span className="mat__jobs">
      <Art id={lead} alt="" className="mat__jobs-lead" />
      <span aria-hidden>→</span>
      {ids.map((id) => (
        <button key={id} type="button" className={`pick-card${value === id ? ' is-on' : ''}`} onClick={() => onPick(id)}>
          <Art id={id} alt={id} />
        </button>
      ))}
    </span>
  );
}

/** Step 1: tap the News card that was drawn, roll for anyone at risk, YES. */
function NewsPicker({ game, onClose }: { game: Game; onClose: () => void }) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [risk, setRisk] = useState<Record<string, RiskInput>>({});
  const title = (
    <span className="flow-title">
      <Art id={DECK_BACK.news} className="flow-title__tile" alt="" />
      News
    </span>
  );

  if (!cardId) {
    return (
      <Sheet title={title} onClose={onClose}>
        <CardPicker game={game} deck="news" onPick={setCardId} />
      </Sheet>
    );
  }
  const pre = newsPreview(game, cardId);
  const ready = pre.atRisk.every((r) => !r.needsRoll || risk[r.playerId]?.roll);
  const set = (id: string, patch: RiskInput) => setRisk((x) => ({ ...x, [id]: { ...x[id], ...patch } }));

  return (
    <Sheet title={title} onClose={onClose}
      footer={
        <>
          <Btn tone="ghost" onClick={() => (setCardId(null), setRisk({}))}>Back</Btn>
          <span className="grow" />
          <Btn tone="teal" big disabled={!ready} onClick={() => act({ type: 'news', cardId, jobRisk: risk }, onClose)}>Yes</Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={cardId} size="lg" className="flow-card flow-card--big" alt={NEWS(cardId).title} />
        <div className="flow-col">
          <EconomyMove from={pre.from} to={pre.to} />
          {pre.arrow !== pre.cardArrow && (
            <span className="happen">
              <Art id="I03" alt="Interest" />
              <span className="num">{pre.cardArrow > 0 ? '+' : ''}{pre.cardArrow} → {pre.arrow > 0 ? '+' : ''}{pre.arrow}</span>
            </span>
          )}
          {pre.atRisk.map((r) => {
            const pl = getPlayer(game, r.playerId);
            const roll = risk[r.playerId]?.roll;
            const loses = !r.needsRoll || (roll !== undefined && rollLoses(pl, roll));
            const saved = loses && !!risk[r.playerId]?.volunteer;
            return (
              <div key={r.playerId} className="risk-row">
                <Token token={pl.token} size={52} />
                <Art id={pl.jobId} className="risk-row__job" alt="" />
                {r.needsRoll && <DieRow value={roll ?? null} onPick={(n) => set(r.playerId, { roll: n })} loseMax={r.dieLoseMax} size={56} />}
                {(roll !== undefined || !r.needsRoll) && (
                  <span className={`tag ${loses && !saved ? 'tag--coral' : 'tag--green'}`}>{loses && !saved ? 'Lost job' : 'Kept'}</span>
                )}
                {loses && r.canVolunteer && (
                  <span className="risk-row__use">
                    <Art id="L12" alt="Volunteer" />
                    <YesNo value={risk[r.playerId]?.volunteer} onPick={(v) => set(r.playerId, { volunteer: v })} />
                  </span>
                )}
              </div>
            );
          })}
          <NewsMoney game={game} cardId={cardId} risk={risk} ready={ready} />
        </div>
      </div>
    </Sheet>
  );
}

/** The News card's money for every affected player, previewed by the engine. */
function NewsMoney({ game, cardId, risk, ready }: { game: Game; cardId: string; risk: Record<string, RiskInput>; ready: boolean }) {
  if (!ready) return null;
  const r = tryApply(game, { type: 'news', cardId, jobRisk: risk });
  if (!r.ok) return null;
  const lines = r.game.last.transfers.filter((t) => t.amount > 0);
  const events = r.game.last.events.filter((e) => e.kind === 'track' || e.kind === 'gotJob' || e.kind === 'flag' || e.kind === 'project' || e.kind === 'bond');
  return (
    <>
      <Happenings game={game} events={events} economy={false} />
      {lines.length > 0 && <Chips game={game} lines={lines} focus="" parties />}
    </>
  );
}
