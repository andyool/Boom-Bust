// The centre of the board: economy, Level 2 tracks, Treasury and laws, over the faint board art.
import { DATA, ECON, RATES, type Game } from '../engine';
import { Art, Chip, Money, econIcon } from '../ui/kit';
import './dashboard.css';

export function Dashboard({ game, onLaws }: { game: Game; onLaws?: () => void }) {
  const l2 = game.level >= 2;
  return (
    <div className={`dash${l2 ? ' dash--l2' : ''}`}>
      <Art id="X01" size="lg" className="dash__bg" alt="" />

      <section className="dash__panel dash__econ" aria-label={`Economy ${game.economy}`}>
        {ECON.map((e) => (
          <span key={e} className={`econ${e === game.economy ? ' is-on' : ''}`}>
            <Art id={econIcon(e)} alt={e} />
          </span>
        ))}
      </section>

      {l2 && (
        <section className="dash__panel dash__tracks">
          <Track icon={DATA.tracks.prices.icon} label="Prices" values={DATA.tracks.prices.positions} value={game.prices} />
          <Track icon={DATA.tracks.wages.icon} label="Wages" values={DATA.tracks.wages.positions} value={game.wages} />
          <Track icon={DATA.tracks.interest.icon} label="Interest" values={RATES} value={game.interest} rba={game.flags.rbaMode} />
        </section>
      )}

      <div className="dash__row">
        <section className="dash__panel dash__treasury" aria-label="Treasury">
          <Art id="I04" className="dash__icon" alt="Treasury" />
          <div className="dash__money">
            <Money amount={game.treasury} big plain />
            <Chip icon="G02" title="Bonds">×{game.bonds}</Chip>
          </div>
          <div className="dash__projects">
            {DATA.projects.map((p, i) => (
              <Art key={p.id} id={p.tile} alt={p.name} className={i < game.projectsBuilt ? 'is-built' : ''} />
            ))}
          </div>
        </section>

        {l2 && (
          <button type="button" className="dash__panel dash__laws" onClick={onLaws} aria-label="Laws">
            <Art id="I05" className="dash__icon" alt="" />
            {Array.from({ length: DATA.constants.maxLaws }, (_, i) => {
              const law = [...game.laws].sort((a, b) => a.passedAt - b.passedAt)[i];
              return law ? <Art key={law.id} id={law.id} className="dash__law" /> : <span key={i} className="dash__law dash__law--empty" />;
            })}
          </button>
        )}
      </div>
    </div>
  );
}

function Track({ icon, label, values, value, rba }: { icon: string; label: string; values: (number | string)[]; value: number | string; rba?: boolean }) {
  return (
    <div className="track" aria-label={`${label} ${value}`}>
      <Art id={icon} className="track__icon" alt={label} />
      <div className="track__cells" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v) => (
          <span key={v} className={`track__cell num${v === value ? ' is-on' : ''}`}>
            {typeof v === 'string' ? v.toLowerCase() : v}
          </span>
        ))}
      </div>
      {rba && <span className="track__rba num">RBA</span>}
    </div>
  );
}
