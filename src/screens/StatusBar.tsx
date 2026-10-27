// The state the app tracks for the table: economy, Level 2 tracks, Treasury, Bonds, projects and laws.
// Not a copy of the board: players keep the physical markers; this is what the app calculates with.
import { DATA, ECON, lawsInOrder, type Game } from '../engine';
import { Art, Money, econIcon } from '../ui/kit';
import './status.css';

export function StatusBar({ game, onLaws }: { game: Game; onLaws?: () => void }) {
  const l2 = game.level >= 2;
  const econAt = ECON.indexOf(game.economy);
  return (
    <header className="status">
      <div className="status__brand">
        <Art id="X02" className="status__logo" alt="Boom & Bust" />
        <span className={`status__level status__level--${game.level} num`}>L{game.level}</span>
      </div>

      <div className="status__item status__econ" aria-label={`Economy ${game.economy}`}>
        <Art id={econIcon(game.economy)} className="status__econ-icon" alt={game.economy} />
        <span className="status__econ-scale" aria-hidden>
          {ECON.map((e, i) => (
            <span key={e} className={i === econAt ? 'is-on' : i < econAt ? 'is-below' : ''} />
          ))}
        </span>
      </div>

      {l2 && (
        <div className="status__item status__tracks">
          <Track icon={DATA.tracks.prices.icon} label="Prices" value={game.prices} />
          <Track icon={DATA.tracks.wages.icon} label="Wages" value={game.wages} />
          <Track icon={DATA.tracks.interest.icon} label="Interest" value={game.interest.toLowerCase()} rba={game.flags.rbaMode} />
        </div>
      )}

      <div className="status__item status__treasury" aria-label="Treasury">
        <Art id="I04" className="status__icon" alt="Treasury" />
        <span className="status__stack">
          <Money amount={game.treasury} big plain />
          <span className="status__row">
            <span className="status__bonds">
              <Art id="G02" alt="Bonds" />
              <b className="num">×{game.bonds}</b>
            </span>
            {DATA.projects.map((p, i) => (
              <Art key={p.id} id={p.tile} alt={p.name} className={`status__pp${i < game.projectsBuilt ? ' is-built' : ''}`} />
            ))}
          </span>
        </span>
      </div>

      {l2 && (
        <button type="button" className="status__item status__laws" onClick={onLaws} aria-label="Laws">
          <Art id="I05" className="status__icon" alt="" />
          {Array.from({ length: DATA.constants.maxLaws }, (_, i) => {
            const law = lawsInOrder(game)[i];
            return law ? <Art key={law.id} id={law.id} className="status__law" /> : <span key={i} className="status__law status__law--empty" />;
          })}
        </button>
      )}
    </header>
  );
}

function Track({ icon, label, value, rba }: { icon: string; label: string; value: number | string; rba?: boolean }) {
  return (
    <span className="track" aria-label={`${label} ${value}`}>
      <Art id={icon} alt={label} />
      <b className="num">{value}</b>
      {rba && <small className="num">RBA</small>}
    </span>
  );
}
