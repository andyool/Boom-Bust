// Teacher menu (SPEC 5.12): opened by holding the logo for 2 seconds. Every change is an action, so Undo covers it.
import { useState, type ReactNode } from 'react';
import {
  BUSINESS, C, DATA, ECON, INDUSTRY, RATES, SPACES, getPlayer, tryApply, type Action, type Edit, type Game,
} from '../engine';
import { store, useStore } from '../store';
import { Stepper } from '../ui/inputs';
import { Art, Btn, Notes, Sheet, Token, econIcon } from '../ui/kit';
import { MoneyPanel } from '../ui/money';
import { SPEC_DECISIONS, TABLE_DECISIONS } from '../ui/rulesInfo';
import { PolicyVote } from './flows/LawFlow';
import { PickPlayer, YesNo, act } from './flows/common';
import './teacher.css';

type Section = 'undo' | 'edit' | 'budget' | 'rba' | 'accc' | 'notes' | 'rules' | 'game';

export function TeacherMenu({ game, onClose, onRecord }: { game: Game; onClose: () => void; onRecord: () => void }) {
  const [sec, setSec] = useState<Section>('undo');
  const nav: { id: Section; label: string; icon: string; show: boolean }[] = [
    { id: 'undo', label: 'Undo', icon: 'K08', show: true },
    { id: 'edit', label: 'Edit', icon: 'MAT', show: true },
    { id: 'budget', label: 'Budget night', icon: 'K04', show: game.level >= 2 },
    { id: 'rba', label: 'Reserve Bank', icon: 'I03', show: game.level >= 2 },
    { id: 'accc', label: 'ACCC fine', icon: 'M16', show: game.level >= 3 },
    { id: 'notes', label: 'Notes', icon: 'Q03', show: true },
    { id: 'rules', label: 'Rules', icon: 'I05', show: true },
    { id: 'game', label: 'Game', icon: 'C01', show: true },
  ];

  if (sec === 'budget') {
    return <PolicyVote game={game} mode="budget" title={<span className="flow-title"><Art id="K04" className="flow-title__tile" alt="" />Budget night</span>} onClose={() => setSec('undo')} />;
  }

  return (
    <Sheet icon="X02" title="Teacher" onClose={onClose}>
      <div className="teacher">
        <nav className="teacher__nav">
          {nav.filter((n) => n.show).map((n) => (
            <button key={n.id} type="button" className={`teacher__tab${sec === n.id ? ' is-on' : ''}`} onClick={() => setSec(n.id)}>
              <Art id={n.icon} alt="" />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="teacher__body">
          {sec === 'undo' && <UndoList />}
          {sec === 'edit' && <EditPanel game={game} />}
          {sec === 'rba' && <RbaPanel game={game} />}
          {sec === 'accc' && <AcccPanel game={game} />}
          {sec === 'notes' && <NotesPanel game={game} />}
          {sec === 'rules' && <RulesPanel />}
          {sec === 'game' && <GamePanel game={game} onRecord={onRecord} onClose={onClose} />}
        </div>
      </div>
    </Sheet>
  );
}

function Row({ label, icon, children }: { label: string; icon?: string; children: ReactNode }) {
  return (
    <div className="t-row">
      <span className="t-row__label">
        {icon && <Art id={icon} alt="" />}
        {label}
      </span>
      <div className="t-row__ctl">{children}</div>
    </div>
  );
}

const edit = (...edits: Edit[]) => act({ type: 'edit', edits });

// ---------------------------------------------------------------------------
// Undo several steps

const DESCRIBE: Record<Action['type'], string> = {
  setup: 'Setup', roll: 'Roll', moveTo: 'Move', next: 'Next', news: 'News', paydaySettle: 'Payday', paydayDone: 'Payday done',
  addSite: '+ Site', study: 'Study', setClip: 'Price clip', cancelDeal: 'Deal ended', buy: 'Buy', pass: 'Pass', auction: 'Auction',
  payRent: 'Pay', drawCard: 'Card', taxTime: 'Tax Time', openDay: 'Open Day', superFund: 'Super', jobCut: 'Job Cut',
  parliament: 'Parliament', loan: 'Loan', repay: 'Repay', sell: 'Sell', trade: 'Trade', savings: 'Savings', deal: 'Deal',
  bankrupt: 'Bankrupt', lastRound: 'Last round', endGame: 'End game', finalCash: 'Cash', budgetNight: 'Budget night',
  accc: 'ACCC fine', setting: 'Setting', edit: 'Edit',
};

function actionArt(a: Action): string | null {
  switch (a.type) {
    case 'news':
    case 'drawCard':
    case 'parliament':
    case 'budgetNight':
      return a.cardId;
    case 'sell':
    case 'trade':
    case 'addSite':
    case 'setClip':
      return BUSINESS[a.businessId]?.tile ?? null;
    case 'moveTo':
      return SPACES[a.pos]?.tile ?? null;
    case 'paydaySettle':
    case 'paydayDone':
      return 'C01';
    case 'loan':
    case 'repay':
      return 'G01';
    default:
      return null;
  }
}

function detail(a: Action): string {
  switch (a.type) {
    case 'roll':
      return `${a.d1} + ${a.d2}`;
    case 'auction':
      return `$${a.bid}`;
    case 'savings':
      return `${a.amount > 0 ? '+' : ''}$${a.amount}`;
    case 'finalCash':
      return `$${a.cash}`;
    case 'superFund':
      return `+$${a.own}`;
    default:
      return '';
  }
}

function UndoList() {
  const { actions } = useStore();
  const recent = actions.map((a, i) => ({ a, i })).slice(1).slice(-14).reverse();
  return (
    <div className="undo-list">
      {recent.map(({ a, i }, k) => {
        const art = actionArt(a);
        return (
          <div key={i} className="undo-row">
            <span className="undo-row__n num">{i}</span>
            {art ? <Art id={art} alt="" className="undo-row__art" /> : <span className="undo-row__art" />}
            <span className="undo-row__label">{DESCRIBE[a.type]}</span>
            <span className="num undo-row__detail">{detail(a)}</span>
            <Btn tone={k === 0 ? 'navy' : 'ghost'} onClick={() => store.undo(k + 1)}>
              ↶ {k + 1}
            </Btn>
          </div>
        );
      })}
      {!recent.length && <span className="tag">—</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit any value

function EditPanel({ game }: { game: Game }) {
  const [tab, setTab] = useState<'game' | 'player' | 'business'>('game');
  return (
    <div className="t-col">
      <div className="t-tabs">
        <Btn tone={tab === 'game' ? 'navy' : 'ghost'} onClick={() => setTab('game')}><Art id="I04" alt="" />Table</Btn>
        <Btn tone={tab === 'player' ? 'navy' : 'ghost'} onClick={() => setTab('player')}><Art id="T01" alt="" />Players</Btn>
        <Btn tone={tab === 'business' ? 'navy' : 'ghost'} onClick={() => setTab('business')}><Art id="K06" alt="" />Businesses</Btn>
      </div>
      {tab === 'game' && <EditGame game={game} />}
      {tab === 'player' && <EditPlayer game={game} />}
      {tab === 'business' && <EditBusiness game={game} />}
    </div>
  );
}

function EditGame({ game }: { game: Game }) {
  const l2 = game.level >= 2;
  return (
    <div className="t-col">
      <Row label="Economy">
        {ECON.map((e) => (
          <button key={e} type="button" className={`t-icon${game.economy === e ? ' is-on' : ''}`} onClick={() => edit({ target: 'game', field: 'economy', value: e })}>
            <Art id={econIcon(e)} alt={e} />
          </button>
        ))}
      </Row>
      {l2 && (
        <>
          <Row label="Prices" icon="I01">
            {DATA.tracks.prices.positions.map((v) => (
              <Btn key={v} tone={game.prices === v ? 'teal' : 'ghost'} onClick={() => edit({ target: 'game', field: 'prices', value: v })}>{v}</Btn>
            ))}
          </Row>
          <Row label="Wages" icon="I02">
            {DATA.tracks.wages.positions.map((v) => (
              <Btn key={v} tone={game.wages === v ? 'teal' : 'ghost'} onClick={() => edit({ target: 'game', field: 'wages', value: v })}>{v}</Btn>
            ))}
          </Row>
          <Row label="Interest" icon="I03">
            {RATES.map((r) => (
              <Btn key={r} tone={game.interest === r ? 'teal' : 'ghost'} onClick={() => edit({ target: 'game', field: 'interest', value: r })}>{r.toLowerCase()}</Btn>
            ))}
          </Row>
        </>
      )}
      <Row label="Treasury" icon="I04">
        <Stepper value={game.treasury} steps={[10, 100]} format={(n) => `$${n}`} onChange={(v) => edit({ target: 'game', field: 'treasury', value: v })} />
      </Row>
      <Row label="Bonds" icon="G02">
        <Stepper value={game.bonds} onChange={(v) => edit({ target: 'game', field: 'bonds', value: v })} />
      </Row>
      <Row label="Projects">
        {DATA.projects.map((p, i) => (
          <button key={p.id} type="button" className={`t-icon${i < game.projectsBuilt ? ' is-on' : ' is-off'}`}
            onClick={() => edit({ target: 'game', field: 'projectsBuilt', value: i + 1 === game.projectsBuilt ? i : i + 1 })}>
            <Art id={p.tile} alt={p.name} />
          </button>
        ))}
      </Row>
      {l2 && (
        <Row label="Laws" icon="I05">
          {game.laws.map((l) => (
            <button key={l.id} type="button" className="t-card" onClick={() => edit({ target: 'law', cardId: l.id, on: false })} aria-label={`Remove ${l.id}`}>
              <Art id={l.id} alt="" />
              <span className="t-card__x">✕</span>
            </button>
          ))}
        </Row>
      )}
    </div>
  );
}

const KEEP = DATA.cards.life.filter((c) => c.keep).map((c) => c.id);

function EditPlayer({ game }: { game: Game }) {
  const [pid, setPid] = useState(game.players[game.turnIndex].id);
  const [name, setName] = useState<string | null>(null);
  const p = getPlayer(game, pid);
  const set = (field: Extract<Edit, { target: 'player' }>['field'], value: number | string | boolean | string[]) =>
    edit({ target: 'player', playerId: pid, field, value });
  const heldByOthers = new Set(game.players.filter((x) => x.id !== pid).map((x) => x.jobId));
  return (
    <div className="t-col">
      <PickPlayer game={game} ids={game.players.map((x) => x.id)} value={pid} size={56} onPick={(id) => (setPid(id), setName(null))} />
      <Row label="Name">
        <input className="t-input" value={name ?? p.name} maxLength={14} onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== null && name.trim() && name !== p.name && set('name', name.trim())} />
      </Row>
      <Row label="Space">
        <div className="t-tiles">
          {SPACES.map((s) => (
            <button key={s.pos} type="button" className={`t-tile${p.position === s.pos ? ' is-on' : ''}`} onClick={() => set('position', s.pos)} aria-label={s.label}>
              <Art id={s.tile} alt="" />
            </button>
          ))}
        </div>
      </Row>
      <Row label="Job">
        <div className="t-tiles t-tiles--jobs">
          {DATA.jobs.map((j) => (
            <button key={j.id} type="button" disabled={heldByOthers.has(j.id)} className={`t-tile${p.jobId === j.id ? ' is-on' : ''}`} onClick={() => set('jobId', j.id)}>
              <Art id={j.id} alt={j.name} />
            </button>
          ))}
        </div>
      </Row>
      <Row label="Status">
        {(['employed', 'looking', 'studying'] as const).map((st) => (
          <button key={st} type="button" className={`t-icon${p.jobStatus === st ? ' is-on' : ''}`} onClick={() => set('jobStatus', st)}>
            <Art id={st === 'employed' ? p.jobId : st === 'looking' ? 'K07' : 'I08'} alt={st} />
          </button>
        ))}
      </Row>
      <Row label="Loans" icon="G01"><Stepper value={p.loans} onChange={(v) => set('loans', v)} /></Row>
      <Row label="HECS" icon="G03"><YesNo value={p.hecs} onPick={(v) => set('hecs', v)} /></Row>
      <Row label="Super" icon="I09"><Stepper value={p.superBalance} steps={[10, 100]} format={(n) => `$${n}`} onChange={(v) => set('superBalance', v)} /></Row>
      {game.level >= 2 && (
        <Row label="Savings" icon="I03"><Stepper value={p.savings} steps={[C.savingsBlock]} format={(n) => `$${n}`} onChange={(v) => set('savings', v)} /></Row>
      )}
      <Row label="Bankrupt" icon="G04"><Stepper value={p.bankruptTokens} max={C.bankruptTokens} onChange={(v) => set('bankruptTokens', v)} /></Row>
      <Row label="Paydays" icon="C01"><Stepper value={p.paydays} onChange={(v) => set('paydays', v)} /></Row>
      <Row label="Keep">
        {KEEP.map((id) => {
          const has = p.keepCards.includes(id);
          return (
            <button key={id} type="button" className={`t-card${has ? ' is-on' : ' is-off'}`}
              onClick={() => set('keepCards', has ? p.keepCards.filter((c) => c !== id) : [...p.keepCards, id])}>
              <Art id={id} alt="" />
            </button>
          );
        })}
      </Row>
    </div>
  );
}

function EditBusiness({ game }: { game: Game }) {
  const [biz, setBiz] = useState<string>(DATA.businesses[0].id);
  const h = game.holdings[biz];
  const b = BUSINESS[biz];
  const set = (field: Extract<Edit, { target: 'holding' }>['field'], value: number | string | null) => edit({ target: 'holding', businessId: biz, field, value });
  return (
    <div className="t-col">
      <div className="t-tiles t-tiles--biz">
        {DATA.businesses.map((x) => (
          <button key={x.id} type="button" className={`t-tile${biz === x.id ? ' is-on' : ''}`} onClick={() => setBiz(x.id)} aria-label={x.name}>
            <Art id={x.tile} alt="" />
            {game.holdings[x.id].ownerId && <Token token={getPlayer(game, game.holdings[x.id].ownerId!).token} size={22} className="t-tile__owner" />}
          </button>
        ))}
      </div>
      <Row label="Owner">
        <Btn tone={h.ownerId === null ? 'navy' : 'ghost'} onClick={() => set('ownerId', null)}>
          <Art id={b.industry === 'utilities' ? 'I04' : 'I06'} alt="" />
        </Btn>
        <PickPlayer game={game} ids={game.players.map((p) => p.id)} value={h.ownerId} size={48} onPick={(id) => set('ownerId', id)} />
      </Row>
      {b.extraSiteCost !== null && h.ownerId && (
        <>
          <Row label="Sites" icon="I07"><Stepper value={h.extraSites} max={C.maxExtraSites} onChange={(v) => set('extraSites', v)} /></Row>
          <Row label="Sites paid"><Stepper value={h.sitesPaid} steps={[10, 100]} format={(n) => `$${n}`} onChange={(v) => set('sitesPaid', v)} /></Row>
        </>
      )}
      {game.level >= 3 && h.ownerId && INDUSTRY[b.industry].kind === 'customer' && (
        <Row label="Price clip">
          {(['budget', 'standard', 'premium', 'monopoly'] as const).map((c) => (
            <Btn key={c} tone={h.priceClip === c ? 'purple' : 'ghost'} onClick={() => set('priceClip', c)}>{c}</Btn>
          ))}
        </Row>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reserve Bank, ACCC, notes, rules, game

function RbaPanel({ game }: { game: Game }) {
  return (
    <div className="t-col">
      <Row label="Reserve Bank" icon="I06">
        <YesNo value={game.flags.rbaMode} onPick={(v) => act({ type: 'setting', rbaMode: v })} />
      </Row>
      <Row label="Interest" icon="I03">
        {RATES.map((r) => (
          <Btn key={r} tone={game.interest === r ? 'teal' : 'ghost'} onClick={() => edit({ target: 'game', field: 'interest', value: r })}>{r.toLowerCase()}</Btn>
        ))}
      </Row>
    </div>
  );
}

function AcccPanel({ game }: { game: Game }) {
  const [ids, setIds] = useState<string[]>([]);
  const action: Action = { type: 'accc', playerIds: ids };
  const r = ids.length ? tryApply(game, action) : null;
  return (
    <div className="t-col">
      <div className="pick-row">
        {game.players.map((p) => (
          <button key={p.id} type="button" className={`pick${ids.includes(p.id) ? ' is-on' : ''}`}
            onClick={() => setIds((xs) => (xs.includes(p.id) ? xs.filter((x) => x !== p.id) : [...xs, p.id]))}>
            <Token token={p.token} size={64} />
            <span className="pick__name">{p.name}</span>
          </button>
        ))}
      </div>
      {r?.ok && <MoneyPanel game={game} transfers={r.game.last.transfers} />}
      <Btn tone="coral" big disabled={!ids.length} onClick={() => act(action, () => setIds([]))}>Fine</Btn>
    </div>
  );
}

function NotesPanel({ game }: { game: Game }) {
  return (
    <div className="t-col">
      <Row label="Note helper" icon="Q03">
        <YesNo value={game.settings.noteHelper} onPick={(v) => act({ type: 'setting', noteHelper: v })} />
      </Row>
      <Row label="$90">
        <Notes amount={90} force />
      </Row>
    </div>
  );
}

function RulesPanel() {
  return (
    <div className="t-col rules">
      <h3>Spec</h3>
      <ol>{SPEC_DECISIONS.map((t) => <li key={t}>{t}</li>)}</ol>
      <h3>This table</h3>
      <ol>{TABLE_DECISIONS.map((t) => <li key={t}>{t}</li>)}</ol>
    </div>
  );
}

function GamePanel({ game, onRecord, onClose }: { game: Game; onRecord: () => void; onClose: () => void }) {
  const [ask, setAsk] = useState<'end' | 'new' | null>(null);
  const over = game.phase.name === 'over';
  return (
    <div className="t-col">
      <Row label="Record" icon="K01">
        <Btn tone="teal" onClick={onRecord}>Record</Btn>
      </Row>
      {!over && (
        <Row label="End game" icon="C03">
          {ask === 'end' ? (
            <YesNo onPick={(v) => (v ? act({ type: 'endGame' }, onClose) : setAsk(null))} />
          ) : (
            <Btn tone="coral" onClick={() => setAsk('end')}>End game</Btn>
          )}
        </Row>
      )}
      <Row label="New game" icon="X02">
        {ask === 'new' ? (
          <YesNo onPick={(v) => (v ? store.clear() : setAsk(null))} />
        ) : (
          <Btn tone="coral" onClick={() => setAsk('new')}>New game</Btn>
        )}
      </Row>
    </div>
  );
}
