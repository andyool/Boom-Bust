// A player's things: job, money papers, Super, Savings, businesses and KEEP cards.
import { BUSINESS, JOB, getPlayer, owned, type Game, type Player } from '../engine';
import { Art, Chip, Money, Sheet, Token } from '../ui/kit';
import './sheets.css';

/** The job card a player shows: their card, the "looking for work" back, or the Study token. */
export function jobArt(p: Player) {
  if (p.jobStatus === 'looking') return 'K07';
  if (p.jobStatus === 'studying') return 'I08';
  return p.jobId;
}

export function PlayerChips({ game, p }: { game: Game; p: Player }) {
  return (
    <span className="pchips">
      <Art id={jobArt(p)} className="pchips__job" alt={p.jobStatus === 'employed' ? JOB[p.jobId].name : p.jobStatus} />
      {p.study && <b className="num pchips__study">{p.study.tokensLeft}</b>}
      {p.loans > 0 && <Chip icon="G01" title="Loans">×{p.loans}</Chip>}
      {p.hecs && <Chip icon="G03" title="HECS" />}
      {p.superBalance > 0 && <Chip icon="I09" title="Super">${p.superBalance}</Chip>}
      {game.level >= 2 && p.savings > 0 && <Chip icon="I03" title="Savings">${p.savings}</Chip>}
      {p.bankruptTokens > 0 && <Chip icon="G04" title="Bankrupt">{p.bankruptTokens}</Chip>}
      {p.keepCards.map((c) => (
        <Art key={c} id={c} className="pchips__keep" alt={c} />
      ))}
    </span>
  );
}

export function PlayerSheet({ game, playerId, onClose }: { game: Game; playerId: string; onClose: () => void }) {
  const p = getPlayer(game, playerId);
  const biz = owned(game, p.id);
  return (
    <Sheet title={<span className="psheet__title"><Token token={p.token} size={64} current={game.players[game.turnIndex].id === p.id} />{p.name}</span>} onClose={onClose}>
      <div className="psheet">
        <div className="psheet__job">
          <Art id={p.jobStatus === 'looking' ? 'K07' : p.jobId} size="lg" alt={JOB[p.jobId].name} />
          {p.study && (
            <span className="psheet__study">
              {Array.from({ length: p.study.tokensLeft }, (_, i) => (
                <Art key={i} id="I08" alt="Study" />
              ))}
            </span>
          )}
        </div>
        <div className="psheet__side">
          <div className="psheet__stats">
            <Stat icon="I09" label="Super" value={<Money amount={p.superBalance} plain big />} />
            {game.level >= 2 && <Stat icon="I03" label="Savings" value={<Money amount={p.savings} plain big />} />}
            <Stat icon="G01" label="Loans" value={<span className="num psheet__n">×{p.loans}</span>} />
            {p.hecs && <Stat icon="G03" label="HECS" value={<span className="num psheet__n">✓</span>} />}
            {p.bankruptTokens > 0 && <Stat icon="G04" label="Bankrupt" value={<span className="num psheet__n">{p.bankruptTokens}</span>} />}
          </div>
          {biz.length > 0 && (
            <div className="psheet__deeds">
              {biz.map((h) => (
                <span key={h.businessId} className="psheet__deed">
                  <Art id={BUSINESS[h.businessId].deed} alt={BUSINESS[h.businessId].name} />
                  {h.extraSites > 0 && (
                    <span className="psheet__sites">
                      {Array.from({ length: h.extraSites }, (_, i) => (
                        <Art key={i} id="I07" alt="Extra Site" />
                      ))}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          {p.keepCards.length > 0 && (
            <div className="psheet__deeds">
              {p.keepCards.map((c) => (
                <span key={c} className="psheet__deed">
                  <Art id={c} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="stat">
      <Art id={icon} alt="" />
      <span className="stat__label">{label}</span>
      {value}
    </div>
  );
}
