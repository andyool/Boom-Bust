// Payday (SPEC 5.5), working version: News, then income to debts, then DONE.
// Stage 4 turns this into the full player-mat layout with all seven steps and Choices.
import { useState } from 'react';
import {
  ECON, NEWS, getPlayer, newsPreview, paydayNeeds, rollLoses, type Game, type GameEvent, type PaydayPhase, type RiskInput,
} from '../../engine';
import { DieRow } from '../../ui/inputs';
import { Art, Btn, Sheet, Token, econIcon } from '../../ui/kit';
import { MoneyPanel } from '../../ui/money';
import { CardPicker, DECK_BACK } from './CardPicker';
import { YesNo, act } from './common';
import './flows.css';

export function PaydaySheet({ game, onClose }: { game: Game; onClose: () => void }) {
  if (game.phase.name !== 'payday') return null;
  const ph = game.phase;
  const p = getPlayer(game, ph.playerId);
  const title = (
    <span className="flow-title">
      <Token token={p.token} size={52} current />
      <Art id="C01" className="flow-title__tile" alt="" />
      Payday
    </span>
  );
  if (ph.step === 'news') return <NewsStep game={game} title={title} onClose={onClose} />;
  if (ph.step === 'settle') return <SettleStep game={game} ph={ph} title={title} onClose={onClose} />;
  return <ChoicesStep game={game} ph={ph} title={title} onClose={onClose} />;
}

type StepProps = { game: Game; title: React.ReactNode; onClose: () => void };

function NewsStep({ game, title, onClose }: StepProps) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [risk, setRisk] = useState<Record<string, RiskInput>>({});

  if (!cardId) {
    return (
      <Sheet title={title} onClose={onClose}>
        <div className="flow-col">
          <span className="question__q">
            <Art id={DECK_BACK.news} alt="" />
            News
          </span>
          <CardPicker game={game} deck="news" onPick={setCardId} />
        </div>
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
          <Btn tone="teal" big disabled={!ready} onClick={() => act({ type: 'news', cardId, jobRisk: risk })}>Yes</Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={cardId} size="lg" className="flow-card flow-card--big" alt={NEWS(cardId).title} />
        <div className="flow-col">
          <EconomyMove from={pre.from} to={pre.to} />
          {pre.atRisk.map((r) => {
            const pl = getPlayer(game, r.playerId);
            const roll = risk[r.playerId]?.roll;
            const loses = !r.needsRoll || (roll !== undefined && rollLoses(pl, roll));
            return (
              <div key={r.playerId} className="risk-row">
                <Token token={pl.token} size={52} />
                <Art id={pl.jobId} className="risk-row__job" alt="" />
                {r.needsRoll && <DieRow value={roll ?? null} onPick={(n) => set(r.playerId, { roll: n })} loseMax={r.dieLoseMax} size={56} />}
                {(roll !== undefined || !r.needsRoll) && (
                  <span className={`tag ${loses && !risk[r.playerId]?.volunteer ? 'tag--coral' : 'tag--green'}`}>
                    {loses && !risk[r.playerId]?.volunteer ? 'Lost job' : 'Kept'}
                  </span>
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
        </div>
      </div>
    </Sheet>
  );
}

export function EconomyMove({ from, to }: { from: string; to: string }) {
  return (
    <div className="econ-move">
      <Art id={econIcon(from)} alt={from} className={from === to ? '' : 'is-faded'} />
      {from !== to && (
        <>
          <span className={`econ-move__arrow ${ECON.indexOf(to as never) > ECON.indexOf(from as never) ? 'is-up' : 'is-down'}`} aria-hidden>
            {ECON.indexOf(to as never) > ECON.indexOf(from as never) ? '▲' : '▼'}
          </span>
          <Art id={econIcon(to)} alt={to} />
        </>
      )}
    </div>
  );
}

/** Non-money happenings from the News card: economy, tracks, jobs, projects. */
export function Happenings({ game, events }: { game: Game; events: GameEvent[] }) {
  const items = events.flatMap((e, i) => {
    switch (e.kind) {
      case 'economy':
        return e.from === e.to ? [] : [<EconomyMove key={i} from={e.from} to={e.to} />];
      case 'track':
        return [
          <span key={i} className="happen">
            <Art id={{ prices: 'I01', wages: 'I02', interest: 'I03' }[e.track]} alt={e.track} />
            <span className="num">{String(e.from).toLowerCase()} → {String(e.to).toLowerCase()}</span>
          </span>,
        ];
      case 'lostJob':
      case 'gotJob':
        return [
          <span key={i} className="happen">
            <Token token={getPlayer(game, e.playerId).token} size={44} />
            <Art id={e.kind === 'lostJob' ? 'K07' : getPlayer(game, e.playerId).jobId} alt="" />
            <span className={`tag ${e.kind === 'lostJob' ? 'tag--coral' : 'tag--green'}`}>{e.kind === 'lostJob' ? 'Lost job' : 'Got job'}</span>
          </span>,
        ];
      case 'project':
        return [
          <span key={i} className="happen">
            <Art id={e.projectId} alt="" />
            <span className="tag tag--green">Built</span>
          </span>,
        ];
      case 'flag':
        return e.on ? [<span key={i} className="happen"><Art id="G01" alt="" /><span className="tag tag--coral">No loans</span></span>] : [];
      default:
        return [];
    }
  });
  return items.length ? <div className="happenings">{items}</div> : null;
}

function SettleStep({ game, ph, title, onClose }: StepProps & { ph: PaydayPhase }) {
  const p = getPlayer(game, ph.playerId);
  const needs = paydayNeeds(game, p.id);
  const [newJob, setNewJob] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [fortune, setFortune] = useState<boolean | undefined>();
  const ready = (!needs.studyFinish || newJob) && (!needs.fortune || fortune !== undefined);
  const newsLines = ph.lines.filter((l) => l.step === 'news');

  return (
    <Sheet title={title} onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <Btn tone="teal" big disabled={!ready}
            onClick={() => act({ type: 'paydaySettle', ...(newJob ? { newJobId: newJob } : {}), ...(upgrade ? { upgradeJobId: upgrade } : {}), ...(fortune !== undefined ? { fortune } : {}) })}>
            Next
          </Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        {ph.newsCard && <Art id={ph.newsCard} className="flow-card" alt="" />}
        <div className="flow-col">
          <Happenings game={game} events={ph.events} />
          <MoneyPanel game={game} transfers={newsLines} focus={p.id} />
          {needs.studyFinish && (
            <div className="question">
              <span className="question__q"><Art id="I08" alt="" />→</span>
              <div className="thumbs thumbs--cards">
                {needs.studyFinish.options.map((j) => (
                  <button key={j.id} type="button" className={`pick-card${newJob === j.id ? ' is-on' : ''}`} onClick={() => setNewJob(j.id)}>
                    <Art id={j.id} alt={j.name} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {needs.upgrade && (
            <div className="question">
              <span className="question__q"><Art id={p.jobId} alt="" />→</span>
              <div className="thumbs thumbs--cards">
                {needs.upgrade.options.map((j) => (
                  <button key={j.id} type="button" className={`pick-card${upgrade === j.id ? ' is-on' : ''}`} onClick={() => setUpgrade(upgrade === j.id ? null : j.id)}>
                    <Art id={j.id} alt={j.name} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {needs.fortune && (
            <div className="question">
              <span className="question__q"><Art id="P14" alt="" />Cash over ${needs.fortune.cashOver}?</span>
              <YesNo value={fortune} onPick={setFortune} />
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function ChoicesStep({ game, ph, title, onClose }: StepProps & { ph: PaydayPhase }) {
  const p = getPlayer(game, ph.playerId);
  const lines = ph.lines.filter((l) => l.step !== 'news');
  return (
    <Sheet title={title} onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <Btn tone="teal" big onClick={() => act({ type: 'paydayDone' })}>Done</Btn>
        </>
      }>
      <MoneyPanel game={game} transfers={lines} focus={p.id} />
    </Sheet>
  );
}

