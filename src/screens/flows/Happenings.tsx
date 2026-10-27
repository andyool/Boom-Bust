// Non-money happenings shown as pictures: economy moves, track changes, jobs, projects, Bonds.
import { DATA, ECON, getPlayer, type Econ, type Game, type GameEvent } from '../../engine';
import { Art, Token, econIcon } from '../../ui/kit';
import './flows.css';

export function EconomyMove({ from, to }: { from: Econ; to: Econ }) {
  const up = ECON.indexOf(to) > ECON.indexOf(from);
  return (
    <div className="econ-move">
      <Art id={econIcon(from)} alt={from} className={from === to ? '' : 'is-faded'} />
      {from !== to && (
        <>
          <span className={`econ-move__arrow ${up ? 'is-up' : 'is-down'}`} aria-hidden>
            {up ? '▲' : '▼'}
          </span>
          <Art id={econIcon(to)} alt={to} />
        </>
      )}
    </div>
  );
}

const TRACK_ICON = {
  prices: DATA.tracks.prices.icon,
  wages: DATA.tracks.wages.icon,
  interest: DATA.tracks.interest.icon,
};

export function Happenings({ game, events, economy = true }: { game: Game; events: GameEvent[]; economy?: boolean }) {
  const items = events.flatMap((e, i) => {
    switch (e.kind) {
      case 'economy':
        return economy && e.from !== e.to ? [<EconomyMove key={i} from={e.from} to={e.to} />] : [];
      case 'track': {
        const up = typeof e.to === 'number' ? e.to > (e.from as number) : DATA.tracks.interest.positions.indexOf(e.to) > DATA.tracks.interest.positions.indexOf(e.from as never);
        return [
          <span key={i} className="happen">
            <Art id={TRACK_ICON[e.track]} alt={e.track} />
            <span className={`econ-move__arrow ${up ? 'is-up' : 'is-down'}`} aria-hidden>{up ? '▲' : '▼'}</span>
            <span className="num">{String(e.to).toLowerCase()}</span>
          </span>,
        ];
      }
      case 'lostJob':
      case 'gotJob':
      case 'keptJob': {
        const p = getPlayer(game, e.playerId);
        const lost = e.kind === 'lostJob';
        return [
          <span key={i} className="happen">
            <Token token={p.token} size={40} />
            <Art id={lost ? 'K07' : p.jobId} alt="" />
            {e.kind !== 'keptJob' || e.volunteer ? (
              <span className={`tag ${lost ? 'tag--coral' : 'tag--green'}`}>{lost ? 'Lost job' : e.kind === 'gotJob' ? 'Got job' : 'Kept'}</span>
            ) : (
              <span className="tag tag--green">Kept</span>
            )}
          </span>,
        ];
      }
      case 'newJob':
        return [
          <span key={i} className="happen">
            <Token token={getPlayer(game, e.playerId).token} size={40} />
            <Art id={e.oldJobId} alt="" className="is-faded" />
            <span aria-hidden>→</span>
            <Art id={e.jobId} alt="" />
          </span>,
        ];
      case 'project':
        return [
          <span key={i} className="happen">
            <Art id={e.projectId} alt="" />
            <span className="tag tag--green">Built</span>
          </span>,
        ];
      case 'bond':
        return [
          <span key={i} className="happen">
            <Art id="G02" alt="Bond" />
            <span className="num">×{e.bonds}</span>
          </span>,
        ];
      case 'bondRepaid':
        return [
          <span key={i} className="happen">
            <Art id="G02" alt="Bond repaid" className="is-faded" />
            <span className="num">×{e.bonds}</span>
          </span>,
        ];
      case 'flag':
        return e.on ? [<span key={i} className="happen"><Art id="G01" alt="" className="is-faded" /><span className="tag tag--coral">No loans</span></span>] : [];
      case 'bankruptToken':
        return [
          <span key={i} className="happen">
            <Art id="G04" alt="Bankrupt" />
            <span className="num">{e.left}</span>
          </span>,
        ];
      case 'studyStep':
        return [
          <span key={i} className="happen">
            <Art id="I08" alt="Study" />
            <span className="num">{e.tokensLeft}</span>
          </span>,
        ];
      case 'keepCard':
        return e.on ? [] : [<span key={i} className="happen"><Art id={e.cardId} alt="" className="is-faded" /></span>];
      default:
        return [];
    }
  });
  return items.length ? <div className="happenings">{items}</div> : null;
}
