// The mini board: 40 real tiles in a ring, anticlockwise from PAYDAY at bottom left (as _build/board.py).
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { SPACES, getPlayer, type Game, type Space } from '../engine';
import { Art, Token } from '../ui/kit';
import './board.css';

// A side has 9 spaces between two corners; a corner is 1.6 spaces wide: 2 x 8 + 9 x 5 = 61 units.
const UNITS = 61;
const H = (8 / UNITS) * 100; // corner size and space depth, % of the board
const W = (5 / UNITS) * 100; // space width, % of the board

type Side = 'bottom' | 'right' | 'top' | 'left';
interface Slot {
  left: number;
  top: number;
  width: number;
  height: number;
  rot: number; // CSS degrees, clockwise
  side: Side;
  corner: boolean;
}

/** Where a space sits and how its tile is turned (bottom upright, right -90, top 180, left +90). */
export function slotOf(pos: number): Slot {
  const far = 100 - H;
  if (pos === 0) return { left: 0, top: far, width: H, height: H, rot: 0, side: 'bottom', corner: true };
  if (pos < 10) return { left: H + (pos - 1) * W, top: far, width: W, height: H, rot: 0, side: 'bottom', corner: false };
  if (pos === 10) return { left: far, top: far, width: H, height: H, rot: -90, side: 'right', corner: true };
  if (pos < 20) return { left: far, top: far - (pos - 10) * W, width: H, height: W, rot: -90, side: 'right', corner: false };
  if (pos === 20) return { left: far, top: 0, width: H, height: H, rot: 180, side: 'top', corner: true };
  if (pos < 30) return { left: far - (pos - 20) * W, top: 0, width: W, height: H, rot: 180, side: 'top', corner: false };
  if (pos === 30) return { left: 0, top: 0, width: H, height: H, rot: 90, side: 'left', corner: true };
  return { left: 0, top: H + (pos - 31) * W, width: H, height: W, rot: 90, side: 'left', corner: false };
}

const pct = (n: number) => `${n}%`;

/** The portrait tile art inside its slot, turned to face the outside of the board. */
function artStyle(s: Slot): CSSProperties {
  if (s.corner || s.rot === 0 || s.rot === 180) return { inset: 0, transform: `rotate(${s.rot}deg)` };
  // Sideways slot (H wide, W tall) holds a W x H portrait tile turned 90 degrees.
  return { width: pct((W / H) * 100), height: pct((H / W) * 100), left: pct(((H - W) / 2 / H) * 100), top: pct(((W - H) / 2 / W) * 100), transform: `rotate(${s.rot}deg)` };
}

export function Board({
  game, onTile, children, positions,
}: { game: Game; onTile: (pos: number) => void; children: ReactNode; positions?: Record<string, number> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(([e]) => el.style.setProperty('--w', `${(e.contentRect.width * W) / 100}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = game.players[game.turnIndex];
  return (
    <div className="board" ref={ref}>
      <div className="board__centre" style={{ left: pct(H), top: pct(H), width: pct(100 - 2 * H), height: pct(100 - 2 * H) }}>
        {children}
      </div>
      {SPACES.map((space) => (
        <Tile key={space.pos} space={space} game={game} onTap={() => onTile(space.pos)} />
      ))}
      {game.players.map((p) => {
        const at = (id: string) => positions?.[id] ?? getPlayer(game, id).position;
        const s = slotOf(at(p.id));
        const here = game.players.filter((q) => at(q.id) === at(p.id));
        const k = here.indexOf(p);
        const [dx, dy] = clusterOffset(k, here.length, s.corner);
        return (
          <span
            key={p.id}
            className={`piece${p.id === current?.id ? ' piece--current' : ''}`}
            style={{
              left: pct(s.left + s.width / 2),
              top: pct(s.top + s.height / 2),
              transform: `translate(calc(-50% + ${dx} * var(--w)), calc(-50% + ${dy} * var(--w)))`,
            }}
            aria-label={`${p.name}: ${SPACES[at(p.id)].label}`}
          >
            <Token token={p.token} current={p.id === current?.id} />
          </span>
        );
      })}
    </div>
  );
}

/** Spreads up to six tokens on one space. Offsets are in space widths; corners have more room. */
function clusterOffset(k: number, n: number, corner: boolean): [number, number] {
  if (n === 1) return [0, 0];
  const cols = corner && n > 2 ? 3 : 2;
  const step = corner ? 0.5 : 0.42;
  const rows = Math.ceil(n / cols);
  const col = k % cols;
  const row = Math.floor(k / cols);
  return [(col - (cols - 1) / 2) * step, (row - (rows - 1) / 2) * step];
}

function Tile({ space, game, onTap }: { space: Space; game: Game; onTap: () => void }) {
  const s = slotOf(space.pos);
  const h = space.businessId ? game.holdings[space.businessId] : undefined;
  const owner = h?.ownerId ? getPlayer(game, h.ownerId) : null;
  return (
    <button
      type="button"
      className={`tile tile--${s.side}${s.corner ? ' tile--corner' : ''}`}
      style={{ left: pct(s.left), top: pct(s.top), width: pct(s.width), height: pct(s.height) }}
      onClick={onTap}
      aria-label={space.label + (owner ? `, ${owner.name}` : '')}
    >
      <span className="tile__art" style={artStyle(s)}>
        <Art id={space.tile} alt="" />
      </span>
      {owner && (
        <span className={`owner owner--${s.side}`}>
          <Token token={owner.token} />
          {h!.extraSites > 0 && (
            <span className="owner__sites">
              {Array.from({ length: h!.extraSites }, (_, i) => (
                <Art key={i} id="I07" alt="Extra Site" />
              ))}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

