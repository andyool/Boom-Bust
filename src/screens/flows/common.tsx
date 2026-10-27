// Shared pieces for flows: dispatch with a toast on error, and a preview of an action's money.
import type { ReactNode } from 'react';
import { BUSINESS, getPlayer, tryApply, type Action, type Game } from '../../engine';
import { store } from '../../store';
import { Art, Btn, Token, toast } from '../../ui/kit';
import { MoneyPanel } from '../../ui/money';

/** Applies an action; on success runs `then`. Returns true if it worked. */
export function act(action: Action, then?: () => void): boolean {
  const err = store.dispatch(action);
  if (err) toast(err);
  else then?.();
  return !err;
}

/** What an action would do to the money, shown before the player confirms it. */
export function Preview({ game, action, focus, empty }: { game: Game; action: Action; focus?: string; empty?: ReactNode }) {
  const r = tryApply(game, action);
  if (!r.ok) return <p className="flow-error">{r.error}</p>;
  const t = r.game.last.transfers;
  if (!t.some((x) => x.amount > 0)) return <>{empty ?? null}</>;
  return <MoneyPanel game={game} transfers={t} focus={focus} />;
}

/** A row of tokens to pick a player from. */
export function PickPlayer({ game, ids, value, onPick, size = 72 }: { game: Game; ids: string[]; value?: string | null; onPick: (id: string) => void; size?: number }) {
  return (
    <div className="pick-row">
      {ids.map((id) => {
        const p = getPlayer(game, id);
        return (
          <button key={id} type="button" className={`pick${value === id ? ' is-on' : ''}`} onClick={() => onPick(id)} aria-pressed={value === id}>
            <Token token={p.token} size={size} />
            <span className="pick__name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A grid of business tiles to pick from. */
export function PickBusiness({ ids, value, onPick, deed }: { ids: string[]; value?: string | null; onPick: (id: string) => void; deed?: boolean }) {
  return (
    <div className="pick-grid">
      {ids.map((id) => (
        <button key={id} type="button" className={`pick-card${value === id ? ' is-on' : ''}${deed ? ' pick-card--deed' : ''}`} onClick={() => onPick(id)} aria-pressed={value === id}>
          <Art id={deed ? BUSINESS[id].deed : BUSINESS[id].tile} alt={BUSINESS[id].name} />
        </button>
      ))}
    </div>
  );
}

/** YES / NO picture buttons for a card's question. */
export function YesNo({ value, onPick }: { value?: boolean; onPick: (v: boolean) => void }) {
  return (
    <div className="yes-no">
      <Btn tone={value === true ? 'green' : 'ghost'} big onClick={() => onPick(true)}>Yes</Btn>
      <Btn tone={value === false ? 'coral' : 'ghost'} big onClick={() => onPick(false)}>No</Btn>
    </div>
  );
}

export function WrongSpace({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      Wrong space?
    </button>
  );
}
