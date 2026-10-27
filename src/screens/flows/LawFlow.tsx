// Policy cards (SPEC 5.9, 7.15): Parliament with debate timers, Budget night, and the laws in force.
import { useEffect, useState, type ReactNode } from 'react';
import { BUSINESS, C, POLICY, lawsInOrder, type Action, type AuctionResult, type Game } from '../../engine';
import { NumberPad } from '../../ui/inputs';
import { Art, Btn, Sheet } from '../../ui/kit';
import { CardPicker } from './CardPicker';
import { PickPlayer, act } from './common';
import './flows.css';

/** Pick the proposed Policy card, debate it, then PASSED / FAILED (or APPLY for Budget night). */
export function PolicyVote({
  game, title, mode, onClose, footerLeft,
}: { game: Game; title: ReactNode; mode: 'parliament' | 'budget'; onClose: () => void; footerLeft?: ReactNode }) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<AuctionResult[]>([]);

  if (!cardId) {
    return (
      <Sheet title={title} onClose={onClose} footer={footerLeft}>
        <CardPicker game={game} deck="policy" onPick={setCardId} />
      </Sheet>
    );
  }
  const card = POLICY(cardId);
  const full = card.isLaw && game.laws.length >= C.maxLaws;
  const sells = card.effect.oneOff?.find((op) => op.do === 'auctionUtilities');
  const utilities = sells && 'businesses' in sells ? sells.businesses.filter((id) => game.holdings[id].ownerId === null) : [];
  const extra = { ...(remove ? { removeLawId: remove } : {}), auctions };
  const pass: Action = mode === 'parliament' ? { type: 'parliament', cardId, passed: true, ...extra } : { type: 'budgetNight', cardId, ...extra };
  const badBid = auctions.some((a) => a.winnerId && a.bid < C.utilityAuctionMinBid);
  const reset = () => (setCardId(null), setRemove(null), setAuctions([]));

  return (
    <Sheet title={title} onClose={onClose}
      footer={
        <>
          <Btn tone="ghost" onClick={reset}>Back</Btn>
          <span className="grow" />
          {mode === 'parliament' && (
            <Btn tone="coral" big onClick={() => act({ type: 'parliament', cardId, passed: false }, onClose)}>Failed</Btn>
          )}
          <Btn tone="green" big disabled={(full && !remove) || badBid} onClick={() => act(pass, onClose)}>
            {mode === 'parliament' ? 'Passed' : 'Apply'}
          </Btn>
        </>
      }>
      <div className="flow-row flow-row--top">
        <Art id={card.id} size="lg" className="flow-card flow-card--big" alt={card.title} />
        <div className="flow-col">
          {mode === 'parliament' && <Debate key={cardId} />}
          {!card.isLaw && <span className="tag tag--mustard">1×</span>}
          {full && (
            <div className="question">
              <span className="question__q">
                <Art id="I05" alt="" />
                Remove one
              </span>
              <div className="thumbs thumbs--cards">
                {lawsInOrder(game).map((l) => (
                  <button key={l.id} type="button" className={`pick-card${remove === l.id ? ' is-on' : ''}`} onClick={() => setRemove(l.id)}>
                    <Art id={l.id} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {utilities.map((id) => (
            <UtilityAuction key={id} game={game} businessId={id} value={auctions.find((x) => x.businessId === id)}
              onChange={(r) => setAuctions((xs) => [...xs.filter((x) => x.businessId !== id), r])} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Two optional debate timers: FOR, then AGAINST (C.debateSeconds each). */
function Debate() {
  const [side, setSide] = useState<'for' | 'against' | null>(null);
  const [left, setLeft] = useState(C.debateSeconds);
  useEffect(() => {
    if (!side) return;
    setLeft(C.debateSeconds);
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [side]);
  const pct = side ? (left / C.debateSeconds) * 100 : 100;
  return (
    <div className="debate">
      <Btn tone={side === 'for' ? 'green' : 'ghost'} big onClick={() => setSide('for')}>For</Btn>
      <span className={`debate__clock num${side && left === 0 ? ' is-done' : ''}`}
        style={{ background: `conic-gradient(${side === 'against' ? 'var(--coral)' : 'var(--green)'} ${pct}%, rgba(3,40,78,0.12) 0)` }}>
        <span>{left}</span>
      </span>
      <Btn tone={side === 'against' ? 'coral' : 'ghost'} big onClick={() => setSide('against')}>Against</Btn>
    </div>
  );
}

function UtilityAuction({ game, businessId, value, onChange }: { game: Game; businessId: string; value?: AuctionResult; onChange: (r: AuctionResult) => void }) {
  const b = BUSINESS[businessId];
  const bid = value?.bid ?? 0;
  return (
    <div className="question">
      <span className="question__q">
        <Art id={b.tile} alt={b.name} />
        Auction
      </span>
      <PickPlayer game={game} ids={game.players.map((p) => p.id)} value={value?.winnerId} size={52}
        onPick={(id) => onChange({ businessId, winnerId: value?.winnerId === id ? null : id, bid })} />
      <NumberPad value={bid} onChange={(n) => onChange({ businessId, winnerId: value?.winnerId ?? null, bid: n })} />
    </div>
  );
}

/** The laws in force, oldest first (the latest law wins a conflict). */
export function LawsSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const laws = lawsInOrder(game);
  return (
    <Sheet icon="I05" title="Laws" onClose={onClose} footer={<Btn tone="teal" big onClick={onClose}>Done</Btn>}>
      <div className="laws">
        {Array.from({ length: C.maxLaws }, (_, i) =>
          laws[i] ? (
            <Art key={laws[i].id} id={laws[i].id} size="lg" className="laws__card" alt={POLICY(laws[i].id).title} />
          ) : (
            <span key={i} className="laws__card laws__card--empty" />
          ),
        )}
      </div>
    </Sheet>
  );
}
