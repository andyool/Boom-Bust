// Payday step 7 Choices (SPEC 7.8): Extra Sites, study, Savings, Level 3 price clips and Supply Deals.
import { useState } from 'react';
import {
  BUSINESS, C, INDUSTRY, canAddSite, chargeFor, getPlayer, linked, owned, ownsAll, studyOptions,
  type Action, type Clip, type Game,
} from '../../engine';
import { Art, Btn, Money, Sheet, Token } from '../../ui/kit';
import { StudyButton } from './LandingSheet';
import { PickBusiness, PickPlayer, Preview, YesNo, act } from './common';
import './flows.css';

function Title({ game, playerId, icon, label }: { game: Game; playerId: string; icon: string; label: string }) {
  const p = getPlayer(game, playerId);
  return (
    <span className="flow-title">
      <Token token={p.token} size={52} current />
      <Art id={icon} className="flow-title__tile" alt="" />
      {label}
    </span>
  );
}

type Props = { game: Game; playerId: string; onClose: () => void };

/** + SITE: pay the Extra Site cost to the Bank (max 2 per business, not transport or utilities). */
export function SiteSheet({ game, playerId, onClose }: Props) {
  const [biz, setBiz] = useState<string | null>(null);
  const ids = owned(game, playerId).filter((h) => canAddSite(game, h.businessId)).map((h) => h.businessId);
  const action: Action | null = biz ? { type: 'addSite', businessId: biz } : null;
  return (
    <Sheet title={<Title game={game} playerId={playerId} icon="I07" label="+ Site" />} onClose={onClose}
      footer={<Btn tone="green" big disabled={!action} onClick={() => action && act(action, () => setBiz(null))}>+ Site</Btn>}>
      <div className="flow-col">
        {ids.length ? <PickBusiness ids={ids} value={biz} onPick={setBiz} deed /> : <span className="tag">—</span>}
        {biz && (
          <div className="flow-row">
            <span className="site-count">
              {Array.from({ length: C.maxExtraSites }, (_, i) => (
                <Art key={i} id="I07" alt="" className={i < game.holdings[biz].extraSites ? '' : 'is-empty'} />
              ))}
            </span>
            {action && <Preview game={game} action={action} focus={playerId} />}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** STUDY: TAFE or Uni at Payday (fee to Treasury, HECS card, or free). */
export function StudySheet({ game, playerId, onClose }: Props) {
  const [useCard, setUseCard] = useState<boolean | undefined>();
  const opts = studyOptions(game, playerId, false, !!useCard);
  const p = getPlayer(game, playerId);
  return (
    <Sheet title={<Title game={game} playerId={playerId} icon="I08" label="Study" />} onClose={onClose}>
      <div className="flow-row">
        <Art id={p.jobStatus === 'looking' ? 'K07' : p.jobId} className="flow-card" alt="" />
        <div className="flow-col">
          <div className="study-opt">
            <StudyButton label="TAFE" tokens={C.tafeTokens} level="skilled" ok={opts.tafe.ok}
              onClick={() => act({ type: 'study', course: 'tafe', useL15: !!useCard }, onClose)} />
            {opts.tafe.ok && (opts.tafe.fee > 0 ? <CostTo icon="I04" amount={opts.tafe.fee} /> : <span className="tag tag--green">$0</span>)}
            {opts.tafe.ok && opts.tafe.canUseCard && (
              <span className="study-opt__card">
                <Art id="L15" alt="Free online course" />
                <YesNo value={useCard} onPick={setUseCard} />
              </span>
            )}
          </div>
          <div className="study-opt">
            <StudyButton label="Uni" tokens={C.uniTokens} level="professional" ok={opts.uni.ok}
              onClick={() => act({ type: 'study', course: 'uni' }, onClose)} />
            {opts.uni.ok && (opts.uni.hecs ? <Art id="G03" className="study-opt__hecs" alt="HECS" /> : <span className="tag tag--green">$0</span>)}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function CostTo({ icon, amount }: { icon: string; amount: number }) {
  return (
    <span className="cost-to">
      <Money amount={-amount} />
      <span aria-hidden>→</span>
      <Art id={icon} alt="" />
    </span>
  );
}

/** SAVINGS (Level 2+): put in or take out $200 blocks. */
export function SavingsSheet({ game, playerId, onClose }: Props) {
  const p = getPlayer(game, playerId);
  const [blocks, setBlocks] = useState(1);
  const [dir, setDir] = useState<1 | -1>(1);
  const amount = dir * blocks * C.savingsBlock;
  const maxOut = Math.floor(p.savings / C.savingsBlock);
  const action: Action = { type: 'savings', playerId, amount };
  return (
    <Sheet title={<Title game={game} playerId={playerId} icon="I03" label="Savings" />} onClose={onClose}
      footer={<Btn tone="teal" big disabled={dir === -1 && blocks > maxOut} onClick={() => act(action, onClose)}>{dir > 0 ? 'In' : 'Out'}</Btn>}>
      <div className="flow-row">
        <div className="savings-pile">
          <Art id="I03" alt="Savings" />
          <Money amount={p.savings} big plain />
        </div>
        <div className="flow-col">
          <div className="yes-no">
            <Btn tone={dir === 1 ? 'green' : 'ghost'} big onClick={() => setDir(1)}>In</Btn>
            <Btn tone={dir === -1 ? 'coral' : 'ghost'} big disabled={maxOut === 0} onClick={() => setDir(-1)}>Out</Btn>
          </div>
          <div className="stepper">
            <Btn tone="ghost" big onClick={() => setBlocks((b) => Math.max(1, b - 1))} aria-label="Less">−</Btn>
            <span className="num stepper__n">${blocks * C.savingsBlock}</span>
            <Btn tone="ghost" big onClick={() => setBlocks((b) => b + 1)} aria-label="More">+</Btn>
          </div>
          <Preview game={game} action={action} focus={playerId} />
        </div>
      </div>
    </Sheet>
  );
}

const CLIPS: Clip[] = ['budget', 'standard', 'premium', 'monopoly'];

/** PRICES (Level 3): move the price clip on each customer business. */
export function ClipsSheet({ game, playerId, onClose }: Props) {
  const mine = owned(game, playerId).filter((h) => INDUSTRY[BUSINESS[h.businessId].industry].kind === 'customer');
  return (
    <Sheet title={<Title game={game} playerId={playerId} icon="D09" label="Prices" />} onClose={onClose}
      footer={<Btn tone="teal" big onClick={onClose}>Done</Btn>}>
      <div className="flow-col">
        {!mine.length && <span className="tag">—</span>}
        {mine.map((h) => {
          const b = BUSINESS[h.businessId];
          return (
            <div key={h.businessId} className="clip-row">
              <Art id={b.tile} alt={b.name} />
              {CLIPS.map((c) => {
                const allowed = c !== 'monopoly' || ownsAll(game, playerId, b.industry);
                const price = b.customerPrices![c];
                return (
                  <Btn key={c} tone={h.priceClip === c ? 'purple' : 'ghost'} disabled={!allowed}
                    onClick={() => act({ type: 'setClip', businessId: h.businessId, clip: c })} className="clip-btn">
                    <span>{c}</span>
                    <span className="num">${price}</span>
                  </Btn>
                );
              })}
              <span className="clip-row__now">
                <Money amount={chargeFor(game, h).amount} plain />
              </span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** DEALS (Level 3): cancel a Supply Deal at your own Payday. */
export function DealsSheet({ game, playerId, onClose }: Props) {
  const deals = game.supplyDeals.map((d, index) => ({ d, index })).filter(({ d }) => d.a === playerId || d.b === playerId);
  return (
    <Sheet title={<Title game={game} playerId={playerId} icon="G05" label="Deals" />} onClose={onClose}
      footer={<Btn tone="teal" big onClick={onClose}>Done</Btn>}>
      <div className="flow-col">
        {!deals.length && <span className="tag">—</span>}
        {deals.map(({ d, index }) => (
          <div key={index} className="deal-row">
            <Token token={getPlayer(game, d.a).token} size={52} />
            <Art id={BUSINESS[d.aBiz].tile} alt="" />
            <Art id="G05" alt="Supply Deal" className="deal-row__card" />
            <Art id={BUSINESS[d.bBiz].tile} alt="" />
            <Token token={getPlayer(game, d.b).token} size={52} />
            <span className="grow" />
            <Btn tone="coral" onClick={() => act({ type: 'cancelDeal', index })}>Cancel</Btn>
          </div>
        ))}
      </div>
    </Sheet>
  );
}


/** DEAL (Level 3): two players sign a Supply Deal between businesses in linked industries. */
export function NewDealSheet({ game, playerId, onClose }: { game: Game; playerId: string; onClose: () => void }) {
  const [a, setA] = useState<string | null>(playerId);
  const [aBiz, setABiz] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [bBiz, setBBiz] = useState<string | null>(null);
  const dealsOf = (pid: string) => game.supplyDeals.filter((d) => d.a === pid || d.b === pid).length;
  const canSign = (pid: string) => owned(game, pid).length > 0 && dealsOf(pid) < C.maxSupplyDealsPerPlayer;
  const players = game.players.filter((p) => canSign(p.id)).map((p) => p.id);
  const aIds = a ? owned(game, a).map((h) => h.businessId) : [];
  const bIds = b && aBiz ? owned(game, b).map((h) => h.businessId).filter((id) => linked(BUSINESS[aBiz].industry, BUSINESS[id].industry)) : [];
  const left = C.supplyDealCards - game.supplyDeals.length;
  const ready = a && b && aBiz && bBiz && a !== b && left > 0;
  return (
    <Sheet title={<Title game={game} playerId={a ?? playerId} icon="G05" label="Deal" />} onClose={onClose}
      footer={<Btn tone="green" big disabled={!ready} onClick={() => ready && act({ type: 'deal', a: a!, aBiz: aBiz!, b: b!, bBiz: bBiz! }, onClose)}>Deal</Btn>}>
      <div className="deal">
        <div className="deal__side">
          <PickPlayer game={game} ids={players} value={a} size={56} onPick={(id) => (setA(id), setABiz(null), setB(null), setBBiz(null))} />
          {a && <PickBusiness ids={aIds} value={aBiz} onPick={(id) => (setABiz(id), setBBiz(null))} />}
        </div>
        <div className="deal__mid">
          <Art id="G05" alt="Supply Deal" />
          <span className="num deal__left">{left} / {C.supplyDealCards}</span>
          {ready && (
            <span className="cost-to">
              <Money amount={C.supplyDealPerPayday} />
              <span aria-hidden>×2</span>
              <Art id="C01" alt="each Payday" />
            </span>
          )}
        </div>
        <div className="deal__side">
          <PickPlayer game={game} ids={players.filter((id) => id !== a)} value={b} size={56} onPick={(id) => (setB(id), setBBiz(null))} />
          {b && aBiz && (bIds.length ? <PickBusiness ids={bIds} value={bBiz} onPick={setBBiz} /> : <span className="tag tag--coral">Not linked</span>)}
        </div>
      </div>
    </Sheet>
  );
}
