// Card picker (SPEC 5.6): the real cards of a deck, headed by its back. Held KEEP cards and laws in force are hidden.
import { DATA, availableCards, type Game } from '../../engine';
import { Art } from '../../ui/kit';

export type PickDeck = 'news' | 'life' | 'market' | 'policy';
export const DECK_BACK: Record<PickDeck, string> = {
  news: DATA.cardBacks.news,
  life: DATA.cardBacks.life,
  market: DATA.cardBacks.market,
  policy: DATA.cardBacks.policy,
};

export function CardPicker({ game, deck, onPick }: { game: Game; deck: PickDeck; onPick: (id: string) => void }) {
  const ids = availableCards(game, deck);
  return (
    <div className={`card-grid card-grid--${deck}`}>
      {ids.map((id) => (
        <button key={id} type="button" className="card-grid__card" onClick={() => onPick(id)} aria-label={id}>
          <Art id={id} alt={DATA.cards[deck].find((c) => c.id === id)?.title ?? id} />
        </button>
      ))}
    </div>
  );
}
