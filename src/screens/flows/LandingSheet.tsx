// Landing sheets (SPEC 5.4): one per kind of space. Each previews the engine action, then confirms it.
import { useState } from 'react';
import {
  ACTION_CARD, BUSINESS, C, DATA, INDUSTRY, SPACES, businessesIn, canAddSite, chargeFor, currentPlayer, effectiveClip,
  employed, getPlayer, holdsCard, jobLevel, owned, rentQuote, rollLoses, studyOptions, VOLUNTEER_CARD,
  type Action, type Game, type Space,
} from '../../engine';
import { DieRow, NumberPad } from '../../ui/inputs';
import { Art, Btn, Money, Notes, Sheet, Token } from '../../ui/kit';
import { Party } from '../../ui/money';
import { CardPicker, DECK_BACK } from './CardPicker';
import { PolicyVote } from './LawFlow';
import { PickBusiness, PickPlayer, Preview, WrongSpace, YesNo, act } from './common';
import './flows.css';

interface FlowProps {
  game: Game;
  space: Space;
  onClose: () => void;
  onWrongSpace: () => void;
}

export function LandingSheet({ game, onClose, onWrongSpace }: { game: Game; onClose: () => void; onWrongSpace: () => void }) {
  if (game.phase.name !== 'land') return null;
  const space = SPACES[game.phase.pos];
  const props = { game, space, onClose, onWrongSpace };
  switch (space.kind) {
    case 'business':
      return game.holdings[space.businessId!].ownerId === null ? <BuyFlow {...props} /> : <RentFlow {...props} />;
    case 'utility':
      return <RentFlow {...props} />;
    case 'life':
    case 'market':
      return <CardFlow {...props} deck={space.kind} />;
    case 'tax_time':
      return <TaxFlow {...props} />;
    case 'open_day':
      return <OpenDayFlow {...props} />;
    case 'super_fund':
      return <SuperFlow {...props} />;
    case 'job_cut':
      return <JobCutFlow {...props} />;
    case 'parliament':
      return <ParliamentFlow {...props} />;
    default:
      return null;
  }
}

function Head({ game, space }: { game: Game; space: Space }) {
  const p = currentPlayer(game);
  return (
    <span className="flow-title">
      <Token token={p.token} size={52} current />
      <Art id={space.tile} className="flow-title__tile" alt="" />
      {space.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Unowned business: BUY or PASS (Level 2+: PASS offers an AUCTION)

function BuyFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const b = BUSINESS[space.businessId!];
  const [auction, setAuction] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [bid, setBid] = useState(0);

  if (auction) {
    const action: Action | null = winner && bid >= C.auctionMinBid ? { type: 'auction', winnerId: winner, bid } : null;
    return (
      <Sheet title={<Head game={game} space={space} />} onClose={onClose}
        footer={
          <>
            <Btn tone="ghost" onClick={() => setAuction(false)}>Back</Btn>
            <span className="grow" />
            <Btn tone="ghost" onClick={() => act({ type: 'pass' }, onClose)}>No bids</Btn>
            <Btn tone="green" big disabled={!action} onClick={() => action && act(action, onClose)}>Auction</Btn>
          </>
        }>
        <div className="flow-row">
          <Art id={b.deed} size="lg" className="flow-card" alt={b.name} />
          <div className="flow-col">
            <PickPlayer game={game} ids={game.players.map((x) => x.id)} value={winner} onPick={setWinner} size={64} />
            <div className="flow-row flow-row--top">
              <NumberPad value={bid} onChange={setBid} />
              <div className="flow-col">{action && <Preview game={game} action={action} />}</div>
            </div>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          {game.level >= 2 ? (
            <Btn tone="ghost" big onClick={() => setAuction(true)}>Pass</Btn>
          ) : (
            <Btn tone="ghost" big onClick={() => act({ type: 'pass' }, onClose)}>Pass</Btn>
          )}
          <Btn tone="green" big onClick={() => act({ type: 'buy' }, onClose)}>Buy</Btn>
        </>
      }>
      <div className="flow-row">
        <Art id={b.tile} size="lg" className="flow-tile" alt={b.name} />
        <Art id={b.deed} size="lg" className="flow-card" alt={`${b.name} card`} />
        <div className="flow-col flow-col--center">
          <div className="pay-arrow">
            <Token token={p.token} size={64} />
            <span className="pay-arrow__amt num">${b.price}</span>
            <Party game={game} party="bank" size={64} />
          </div>
          <Notes amount={b.price!} />
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Owned business or utility: who pays whom and why

function RentFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const [payee, setPayee] = useState<string | undefined>();
  const q = rentQuote(game, space.pos, p.id, payee);
  const b = BUSINESS[space.businessId!];
  const ind = INDUSTRY[b.industry];
  const shown = BUSINESS[q.cheapestBiz ?? b.id];
  const gets = q.payee === p.id;

  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          <Btn tone={q.kind === 'none' ? 'teal' : gets ? 'green' : 'coral'} big disabled={!!q.choices}
            onClick={() => act({ type: 'payRent', payeeId: payee }, onClose)}>
            {q.kind === 'none' ? 'Done' : gets ? 'Get' : 'Pay'}
          </Btn>
        </>
      }>
      <div className="flow-row">
        <Art id={b.tile} size="lg" className="flow-tile" alt={b.name} />
        {game.level === 3 && ind.kind === 'customer' ? (
          <ShopAround game={game} industry={b.industry} cheapest={q.cheapestBiz} />
        ) : (
          q.cheapestBiz === undefined && b.deed && <Art id={b.deed} size="lg" className="flow-card" alt="" />
        )}
        <div className="flow-col flow-col--center">
          {q.label && <span className={`tag${q.note === 'monopoly' ? ' tag--coral' : ''}`}>{q.label}</span>}
          {q.qty !== undefined && <span className="num flow-qty">{q.qty} × ${q.each}</span>}
          {q.choices && <PickPlayer game={game} ids={q.choices} value={payee} onPick={setPayee} size={64} />}
          {q.note === 'cheapestYours' && (
            <span className="flow-col flow-col--center">
              <Art id={shown.tile} className="flow-thumb" alt={shown.name} />
              <span className="tag tag--green">Yours</span>
            </span>
          )}
          {q.kind !== 'none' && q.payee && (
            <>
              <div className="pay-arrow">
                <Party game={game} party={q.payer!} size={64} />
                <span className="pay-arrow__amt num">${q.amount}</span>
                <Party game={game} party={q.payee} size={64} />
              </div>
              <Notes amount={q.amount} />
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** Level 3: every owned business in the industry with the price it charges; the cheapest is marked. */
function ShopAround({ game, industry, cheapest }: { game: Game; industry: string; cheapest?: string }) {
  const offers = businessesIn(industry).map((b) => game.holdings[b.id]).filter((h) => h.ownerId);
  return (
    <div className="shop">
      {offers.map((h) => (
        <div key={h.businessId} className={`shop__offer${h.businessId === cheapest ? ' is-on' : ''}`}>
          <Art id={BUSINESS[h.businessId].tile} alt={BUSINESS[h.businessId].name} />
          <Token token={getPlayer(game, h.ownerId!).token} size={40} />
          <span className="shop__clip">{effectiveClip(game, h)}</span>
          <Money amount={chargeFor(game, h).amount} plain />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Life and Market: pick the card that was drawn, answer its question, see the result

function CardFlow({ game, space, onClose, onWrongSpace, deck }: FlowProps & { deck: 'life' | 'market' }) {
  const p = currentPlayer(game);
  const [cardId, setCardId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<boolean | undefined>();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);

  if (!cardId) {
    return (
      <Sheet title={<span className="flow-title"><Token token={p.token} size={52} current /><Art id={DECK_BACK[deck]} className="flow-title__tile" alt="" />{space.label}</span>}
        onClose={onClose} footer={<WrongSpace onClick={onWrongSpace} />}>
        <CardPicker game={game} deck={deck} onPick={setCardId} />
      </Sheet>
    );
  }

  const card = ACTION_CARD(cardId);
  const inputs = card.inputs ?? [];
  const asks = inputs.some((i) => i.startsWith('ask'));
  const others = game.players.filter((x) => x.id !== p.id && owned(game, x.id).length > 0).map((x) => x.id);
  const ready = (!asks || answer !== undefined) && (!inputs.includes('chooseOtherOwner') || !others.length || !!otherId);
  const action: Action = {
    type: 'drawCard', cardId,
    ...(asks ? { answer } : {}),
    ...(businessId ? { businessId } : {}),
    ...(otherId ? { otherId } : {}),
  };
  const reset = () => {
    setCardId(null);
    setAnswer(undefined);
    setBusinessId(null);
    setOtherId(null);
  };

  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <Btn tone="ghost" onClick={reset}>Back</Btn>
          <span className="grow" />
          <Btn tone="teal" big disabled={!ready} onClick={() => act(action, onClose)}>Done</Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={card.id} size="lg" className="flow-card flow-card--big" alt={card.title} />
        <div className="flow-col">
          {inputs.includes('askCashOver300') && (
            <Question icon="Q04" text="Cash over $300?">
              <YesNo value={answer} onPick={setAnswer} />
            </Question>
          )}
          {inputs.includes('askBuyInsurance') && (
            <Question icon="L19" text="Buy?">
              <YesNo value={answer} onPick={setAnswer} />
            </Question>
          )}
          {inputs.includes('chooseOwnBusiness') && (
            <Question icon="I07" text="+ Site?">
              <PickBusiness ids={owned(game, p.id).filter((h) => canAddSite(game, h.businessId)).map((h) => h.businessId)}
                value={businessId} onPick={(id) => setBusinessId(id === businessId ? null : id)} />
            </Question>
          )}
          {inputs.includes('chooseUnownedBusiness') && (
            <Question icon="K06" text="Buy one?">
              <PickBusiness ids={DATA.businesses.filter((b) => b.price !== null && game.holdings[b.id].ownerId === null).map((b) => b.id)}
                value={businessId} onPick={(id) => setBusinessId(id === businessId ? null : id)} />
            </Question>
          )}
          {inputs.includes('chooseOtherOwner') && others.length > 0 && (
            <Question icon="G05" text="Who?">
              <PickPlayer game={game} ids={others} value={otherId} onPick={setOtherId} size={64} />
            </Question>
          )}
          {ready && <Preview game={game} action={action} focus={p.id} empty={<span className="tag">No money</span>} />}
        </div>
      </div>
    </Sheet>
  );
}

function Question({ icon, text, children }: { icon: string; text: string; children: React.ReactNode }) {
  return (
    <div className="question">
      <span className="question__q">
        <Art id={icon} alt="" />
        {text}
      </span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tax Time, Open Day, Super Fund, JOB CUT

function TaxFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const biz = owned(game, p.id);
  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          <Btn tone={biz.length ? 'coral' : 'teal'} big onClick={() => act({ type: 'taxTime' }, onClose)}>{biz.length ? 'Pay' : 'Done'}</Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={space.tile} size="lg" className="flow-tile" alt={space.label} />
        <div className="flow-col">
          <div className="thumbs">
            {biz.map((h) => (
              <Art key={h.businessId} id={BUSINESS[h.businessId].tile} alt={BUSINESS[h.businessId].name} />
            ))}
          </div>
          <Preview game={game} action={{ type: 'taxTime' }} focus={p.id} empty={<span className="tag">$0</span>} />
        </div>
      </div>
    </Sheet>
  );
}

function OpenDayFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const opts = studyOptions(game, p.id, true);
  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          <Btn tone="ghost" big onClick={() => act({ type: 'openDay', course: null }, onClose)}>No</Btn>
        </>
      }>
      <div className="flow-row">
        <Art id={space.tile} size="lg" className="flow-tile" alt={space.label} />
        <Art id={p.jobStatus === 'looking' ? 'K07' : p.jobId} className="flow-card" alt="" />
        <div className="flow-col flow-col--center">
          <StudyButton label="TAFE" tokens={C.tafeTokens} level="skilled" ok={opts.tafe.ok}
            onClick={() => act({ type: 'openDay', course: 'tafe' }, onClose)} />
          <StudyButton label="Uni" tokens={C.uniTokens} level="professional" ok={opts.uni.ok}
            onClick={() => act({ type: 'openDay', course: 'uni' }, onClose)} />
        </div>
      </div>
    </Sheet>
  );
}

export function StudyButton({ label, tokens, level, ok, onClick }: { label: string; tokens: number; level: string; ok: boolean; onClick: () => void }) {
  const target = DATA.jobs.find((j) => j.level === level)!.id;
  return (
    <Btn tone="purple" big disabled={!ok} onClick={onClick} className="study-btn">
      <span>{label}</span>
      <span className="study-btn__tokens">
        {Array.from({ length: tokens }, (_, i) => (
          <Art key={i} id="I08" alt="" />
        ))}
      </span>
      <span aria-hidden>→</span>
      <Art id={target} alt="" />
    </Btn>
  );
}

function SuperFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const [own, setOwn] = useState(0);
  const steps = Array.from({ length: C.superFundOwnMax / C.superFundStep + 1 }, (_, i) => i * C.superFundStep);
  const action: Action = { type: 'superFund', own };
  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          <Btn tone="teal" big onClick={() => act(action, onClose)}>Done</Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={space.tile} size="lg" className="flow-tile" alt={space.label} />
        <div className="flow-col">
          {!employed(p) && (
            <span className="question__q">
              <Art id={p.jobStatus === 'studying' ? 'I08' : 'K07'} alt="" />
              <span aria-hidden>→</span>
              <Art id="I09" alt="" />
              <span className="num">$0</span>
            </span>
          )}
          <div className="question">
            <span className="question__q">
              <Token token={p.token} size={40} />
              <span aria-hidden>→</span>
              <Art id="I09" alt="Super" />
            </span>
            <div className="chips-pick">
              {steps.map((n) => (
                <Btn key={n} tone={own === n ? 'mustard' : 'ghost'} onClick={() => setOwn(n)}>${n}</Btn>
              ))}
            </div>
          </div>
          <Preview game={game} action={action} focus={p.id} />
        </div>
      </div>
    </Sheet>
  );
}

function JobCutFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  const p = currentPlayer(game);
  const [roll, setRoll] = useState<number | null>(null);
  const [volunteer, setVolunteer] = useState(false);
  const info = DATA.jobLevels[jobLevel(p)];
  const needsRoll = employed(p) && info.jobRisk !== 'always_lose';
  const loses = employed(p) && (!needsRoll || (roll !== null && rollLoses(p, roll)));
  const ready = !needsRoll || roll !== null;
  const canUse = loses && holdsCard(p, VOLUNTEER_CARD);
  const keeps = !loses || (canUse && volunteer);

  return (
    <Sheet title={<Head game={game} space={space} />} onClose={onClose}
      footer={
        <>
          <WrongSpace onClick={onWrongSpace} />
          <span className="grow" />
          <Btn tone="teal" big disabled={!ready}
            onClick={() => act({ type: 'jobCut', ...(roll !== null ? { roll } : {}), volunteer: canUse && volunteer }, onClose)}>
            Done
          </Btn>
        </>
      }>
      <div className="flow-row">
        <Art id={space.tile} size="lg" className="flow-tile" alt={space.label} />
        <div className="flow-col flow-col--center">
          {!employed(p) ? (
            <Art id={p.jobStatus === 'studying' ? 'I08' : 'K07'} className="flow-card" alt="" />
          ) : (
            <>
              {needsRoll && <DieRow value={roll} onPick={setRoll} loseMax={info.dieLoseMax} size={80} />}
              {ready && (
                <span className="job-flip">
                  <Art id={p.jobId} alt="" className={keeps ? '' : 'is-faded'} />
                  {!keeps && (
                    <>
                      <span aria-hidden>→</span>
                      <Art id="K07" alt="" />
                      <Art id="C02" alt="Job Centre" />
                    </>
                  )}
                  <span className={`tag ${keeps ? 'tag--green' : 'tag--coral'}`}>{keeps ? 'Kept' : 'Lost job'}</span>
                </span>
              )}
              {canUse && (
                <Question icon={VOLUNTEER_CARD} text="Use?">
                  <YesNo value={volunteer} onPick={setVolunteer} />
                </Question>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Parliament (Level 2+)

function ParliamentFlow({ game, space, onClose, onWrongSpace }: FlowProps) {
  return <PolicyVote game={game} title={<Head game={game} space={space} />} mode="parliament" onClose={onClose} footerLeft={<WrongSpace onClick={onWrongSpace} />} />;
}
