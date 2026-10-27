// Tapping a tile opens it large, with its deed, owner, Extra Sites and (Level 3) price clip.
import { BUSINESS, INDUSTRY, SPACES, chargeFor, effectiveClip, getPlayer, type Game } from '../engine';
import { Art, Money, Sheet, Token } from '../ui/kit';
import './sheets.css';

export function TileSheet({ game, pos, onClose }: { game: Game; pos: number; onClose: () => void }) {
  const space = SPACES[pos];
  const b = space.businessId ? BUSINESS[space.businessId] : undefined;
  const h = b ? game.holdings[b.id] : undefined;
  const owner = h?.ownerId ? getPlayer(game, h.ownerId) : null;
  const customer = b && INDUSTRY[b.industry].kind === 'customer';

  return (
    <Sheet title={space.label} onClose={onClose}>
      <div className="tsheet">
        <Art id={space.tile} size="lg" className={`tsheet__tile${space.side === 'corner' ? ' tsheet__tile--corner' : ''}`} alt={space.label} />
        {b && <Art id={b.deed} size="lg" className="tsheet__deed" alt={`${b.name} card`} />}
        {b && (
          <div className="tsheet__owner">
            {owner ? (
              <>
                <Token token={owner.token} size={84} />
                <span className="tsheet__name">{owner.name}</span>
                {h!.extraSites > 0 && (
                  <span className="tsheet__sites">
                    {Array.from({ length: h!.extraSites }, (_, i) => (
                      <Art key={i} id="I07" alt="Extra Site" />
                    ))}
                  </span>
                )}
                {customer && (
                  <span className="tsheet__price">
                    {game.level === 3 && <span className="tsheet__clip">{effectiveClip(game, h!)}</span>}
                    <Money amount={chargeFor(game, h!).amount} big plain />
                  </span>
                )}
              </>
            ) : (
              <>
                <Art id={b.industry === 'utilities' ? 'I04' : 'I06'} className="tsheet__bank" alt={b.industry === 'utilities' ? 'Treasury' : 'Bank'} />
                {b.price !== null && <Money amount={b.price} big plain />}
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
