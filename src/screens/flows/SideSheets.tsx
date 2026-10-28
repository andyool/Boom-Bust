// Side actions (SPEC 5.8): LOAN, REPAY, SELL, TRADE, CAN'T PAY, for the player whose sheet they came from.
import { useState } from 'react';
import {
  BUSINESS, C, DATA, canBorrow, getPlayer, loanLimit, owned, sellValue, type Action, type Game,
} from '../../engine';
import { Art, Btn, Sheet, Token } from '../../ui/kit';
import { PickBusiness, PickPlayer, Preview, YesNo, act } from './common';
import './flows.css';

export type SideKind = 'loan' | 'repay' | 'sell' | 'trade' | 'cantPay';

export function SideSheet({
  game, kind, playerId, onClose, onOpen,
}: { game: Game; kind: SideKind; playerId: string; onClose: () => void; onOpen: (k: SideKind, playerId: string) => void }) {
  switch (kind) {
    case 'loan':
      return <LoanSheet game={game} pid={playerId} onClose={onClose} />;
    case 'repay':
      return <RepaySheet game={game} pid={playerId} onClose={onClose} />;
    case 'sell':
      return <SellSheet game={game} pid={playerId} onClose={onClose} />;
    case 'trade':
      return <TradeSheet game={game} pid={playerId} onClose={onClose} />;
    case 'cantPay':
      return <CantPaySheet game={game} pid={playerId} onClose={onClose} onOpen={onOpen} />;
  }
}

function Title({ game, icon, label, pid }: { game: Game; icon: string; label: string; pid: string }) {
  const p = getPlayer(game, pid);
  return (
    <span className="flow-title">
      <Token token={p.token} size={52} current />
      <Art id={icon} className="flow-title__tile" alt="" />
      {label}
    </span>
  );
}

function LoanSheet({ game, pid, onClose }: { game: Game; pid: string; onClose: () => void }) {
  const p = getPlayer(game, pid);
  const can = canBorrow(game, p.id);
  const limit = loanLimit(game, p.id);
  const action: Action = { type: 'loan', playerId: p.id };
  return (
    <Sheet title={<Title game={game} icon="G01" label="Loan" pid={p.id} />} onClose={onClose}
      footer={<Btn tone="green" big disabled={!can.ok} onClick={() => act(action, onClose)}>Loan</Btn>}>
      <div className="flow-row">
        <Art id="G01" size="lg" className="flow-card" alt="Loan" />
        <div className="flow-col flow-col--center">
          <div className="limit">
            {Array.from({ length: Math.max(limit, p.loans) }, (_, i) => (
              <Art key={i} id="G01" alt="" className={i < p.loans ? '' : 'is-empty'} />
            ))}
            <span className="num limit__n">{p.loans} / {limit}</span>
          </div>
          {can.ok ? (
            <Preview game={game} action={action} focus={p.id} />
          ) : (
            <span className="question__q">
              <Art id={can.why === 'noNewLoans' ? 'N11' : can.why === 'bankrupt' ? 'G04' : 'G01'} alt="" />
              <span className="tag tag--coral">{can.why === 'limit' ? 'Limit' : 'No loans'}</span>
            </span>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function RepaySheet({ game, pid, onClose }: { game: Game; pid: string; onClose: () => void }) {
  const p = getPlayer(game, pid);
  const action: Action = { type: 'repay', playerId: p.id };
  return (
    <Sheet title={<Title game={game} icon="G01" label="Repay" pid={p.id} />} onClose={onClose}
      footer={<Btn tone="coral" big disabled={p.loans < 1} onClick={() => act(action, onClose)}>Repay</Btn>}>
      <div className="flow-row">
        <Art id="G01" size="lg" className="flow-card" alt="Loan" />
        <div className="flow-col flow-col--center">
          <span className="num limit__n">×{p.loans}</span>
          {p.loans > 0 && <Preview game={game} action={action} focus={p.id} />}
        </div>
      </div>
    </Sheet>
  );
}

function SellSheet({ game, onClose, pid }: { game: Game; onClose: () => void; pid: string }) {
  const p = getPlayer(game, pid);
  const [biz, setBiz] = useState<string | null>(null);
  const ids = owned(game, p.id).map((h) => h.businessId);
  return (
    <Sheet title={<Title game={game} icon="I06" label="Sell" pid={p.id} />} onClose={onClose}
      footer={<Btn tone="green" big disabled={!biz} onClick={() => biz && act({ type: 'sell', businessId: biz }, onClose)}>Sell</Btn>}>
      <div className="flow-col">
        {ids.length ? <PickBusiness ids={ids} value={biz} onPick={setBiz} deed /> : <span className="tag">—</span>}
        {biz && (
          <div className="flow-row">
            <span className="tag num">½ ${(BUSINESS[biz].price ?? game.holdings[biz].price ?? 0) + game.holdings[biz].sitesPaid} = ${sellValue(game, biz)}</span>
            <Preview game={game} action={{ type: 'sell', businessId: biz }} focus={p.id} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

function TradeSheet({ game, pid, onClose }: { game: Game; pid: string; onClose: () => void }) {
  const [biz, setBiz] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const ids = DATA.businesses.filter((b) => game.holdings[b.id].ownerId).map((b) => b.id);
  const owner = biz ? game.holdings[biz].ownerId : null;
  return (
    <Sheet title={<Title game={game} icon="K06" label="Trade" pid={pid} />} onClose={onClose}
      footer={<Btn tone="teal" big disabled={!biz || !to} onClick={() => biz && to && act({ type: 'trade', businessId: biz, toPlayerId: to }, onClose)}>Trade</Btn>}>
      <div className="flow-col">
        {ids.length ? <PickBusiness ids={ids} value={biz} onPick={(id) => (setBiz(id), setTo(null))} /> : <span className="tag">—</span>}
        {biz && owner && (
          <div className="trade-to">
            <Token token={getPlayer(game, owner).token} size={64} />
            <span className="pay-arrow__amt num" aria-hidden>→</span>
            <PickPlayer game={game} ids={game.players.filter((p) => p.id !== owner).map((p) => p.id)} value={to} onPick={setTo} size={64} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** CAN'T PAY (SPEC 7.11): ways to raise cash, then PAID or STILL CAN'T. */
function CantPaySheet({
  game, pid: first, onClose, onOpen,
}: { game: Game; pid: string; onClose: () => void; onOpen: (k: SideKind, playerId: string) => void }) {
  const [pid, setPid] = useState(first);
  const [sure, setSure] = useState<boolean | undefined>();
  const [sell, setSell] = useState(false);
  const p = getPlayer(game, pid);
  const action: Action = { type: 'bankrupt', playerId: pid };
  if (sell) return <SellSheet game={game} pid={pid} onClose={() => setSell(false)} />;

  return (
    <Sheet title={<Title game={game} icon="G04" label="Can't pay" pid={pid} />} onClose={onClose}
      footer={
        <>
          <Btn tone="green" big onClick={onClose}>Paid</Btn>
          <span className="grow" />
          <Btn tone="coral" big disabled={!sure} onClick={() => act(action, onClose)}>Still can't</Btn>
        </>
      }>
      <div className="flow-col">
        <PickPlayer game={game} ids={game.players.map((x) => x.id)} value={pid} onPick={(id) => (setPid(id), setSure(undefined))} size={56} />
        <div className="ways">
          <Btn tone="ghost" big disabled={!owned(game, pid).length} onClick={() => setSell(true)}>
            <Art id="I06" alt="" />Sell
          </Btn>
          <Btn tone="ghost" big disabled={!canBorrow(game, pid).ok} onClick={() => onOpen('loan', pid)}>
            <Art id="G01" alt="" />Loan
          </Btn>
          {game.level >= 2 && (
            <Btn tone="ghost" big disabled>
              <Art id="I03" alt="" />Savings ${p.savings}
            </Btn>
          )}
        </div>
        <div className="question">
          <span className="question__q">
            <Art id="G04" alt="" />
            Bankrupt?
          </span>
          <YesNo value={sure} onPick={setSure} />
        </div>
        {sure && (
          <div className="bankrupt">
            <span className="bankrupt__lose">
              {owned(game, pid).map((h) => (
                <Art key={h.businessId} id={BUSINESS[h.businessId].tile} alt="" />
              ))}
              {Array.from({ length: p.loans }, (_, i) => (
                <Art key={`l${i}`} id="G01" alt="" />
              ))}
              <span className="tag tag--coral">Lost</span>
            </span>
            <span className="bankrupt__keep">
              <Art id={p.jobId} alt="" />
              {p.superBalance > 0 && <Art id="I09" alt="" />}
              <span className="tag tag--green">Kept</span>
            </span>
            <span className="bankrupt__tokens">
              <Art id="G04" alt="" />
              {Array.from({ length: C.bankruptTokens }, (_, i) => (
                <Art key={i} id="I08" alt="" />
              ))}
            </span>
            <Preview game={game} action={action} focus={pid} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
