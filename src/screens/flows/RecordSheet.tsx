// Record (SPEC 5.10): one row per Payday, line charts of the Economy (and Level 2 Prices and Wages),
// and SHARE as CSV through the iPad share sheet (download as a fallback).
import { useLayoutEffect, useRef, useState } from 'react';
import { DATA, ECON, getPlayer, type Game, type RecordRow } from '../../engine';
import { Art, Btn, Sheet, Token, econIcon, toast } from '../../ui/kit';
import { recordCsv } from './recordCsv';
import './record.css';

export function RecordSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const rows = game.record;
  const l2 = game.level >= 2;
  const [sel, setSel] = useState<number | null>(null);

  return (
    <Sheet icon="K01" title="Record" onClose={onClose}
      footer={<Btn tone="teal" big disabled={!rows.length} onClick={() => shareCsv(game)}>Share</Btn>}>
      {!rows.length ? (
        <div className="record__empty">
          <Art id="C01" alt="" />
          <span className="num">0</span>
        </div>
      ) : (
        <div className="record">
          <div className={`record__charts${l2 ? ' record__charts--two' : ''}`}>
            <figure className="chart-card">
              <figcaption>Economy</figcaption>
              <LineChart
                n={rows.length}
                yMin={0}
                yMax={ECON.length - 1}
                yTicks={ECON.map((e, i) => ({ v: i, icon: econIcon(e), label: e }))}
                series={[{ key: 'economy', label: 'Economy', color: 'var(--navy)', shape: 'circle', values: rows.map((r) => ECON.indexOf(r.economy)) }]}
                sel={sel}
                onSel={setSel}
                format={(_, v) => ECON[v]}
              />
            </figure>
            {l2 && (
              <figure className="chart-card">
                <figcaption>
                  Prices · Wages
                  <span className="legend">
                    <span className="legend__key legend__key--prices" />Prices
                    <span className="legend__key legend__key--wages" />Wages
                  </span>
                </figcaption>
                <LineChart
                  n={rows.length}
                  yMin={0}
                  yMax={Math.max(...DATA.tracks.prices.positions, ...DATA.tracks.wages.positions)}
                  yTicks={[0, 2, 4, 6].map((v) => ({ v, label: String(v) }))}
                  series={[
                    { key: 'prices', label: 'Prices', color: 'var(--coral)', shape: 'circle', values: rows.map((r) => r.prices ?? 0) },
                    { key: 'wages', label: 'Wages', color: 'var(--teal)', shape: 'square', values: rows.map((r) => r.wages ?? 0) },
                  ]}
                  sel={sel}
                  onSel={setSel}
                  format={(s, v) => `${s} ${v}`}
                />
              </figure>
            )}
          </div>
          <RecordTable game={game} rows={rows} sel={sel} onSel={setSel} />
        </div>
      )}
    </Sheet>
  );
}

function RecordTable({ game, rows, sel, onSel }: { game: Game; rows: RecordRow[]; sel: number | null; onSel: (i: number) => void }) {
  const l2 = game.level >= 2;
  return (
    <div className="record__table-wrap">
      <table className="record__table">
        <thead>
          <tr>
            <th>#</th>
            <th><Art id="T01" alt="Player" className="th-icon th-icon--round" /></th>
            <th><Art id="K01" alt="News" className="th-icon" /></th>
            <th><Art id="E03" alt="Economy" className="th-icon" /></th>
            {l2 && <th><Art id="I01" alt="Prices" className="th-icon" /></th>}
            {l2 && <th><Art id="I02" alt="Wages" className="th-icon" /></th>}
            {l2 && <th><Art id="I03" alt="Interest" className="th-icon" /></th>}
            <th><Art id="K07" alt="Out of work" className="th-icon" /></th>
            <th><Art id="I04" alt="Treasury" className="th-icon" /></th>
            <th><Art id="G02" alt="Bonds" className="th-icon" /></th>
            <th><Art id="PP1" alt="Projects" className="th-icon" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.n} className={sel === i ? 'is-sel' : ''} onClick={() => onSel(i)}>
              <td className="num">{r.n}</td>
              <td><Token token={getPlayer(game, r.playerId).token} size={34} /></td>
              <td><Art id={r.newsCard} className="td-card" alt={r.newsCard} /></td>
              <td><Art id={econIcon(r.economy)} className="td-icon" alt={r.economy} /></td>
              {l2 && <td className="num">{r.prices}</td>}
              {l2 && <td className="num">{r.wages}</td>}
              {l2 && <td className="num td-rate">{r.interest?.toLowerCase()}</td>}
              <td className="num">{r.outOfWork}</td>
              <td className="num">${r.treasury}</td>
              <td className="num">{r.bonds}</td>
              <td className="num">{r.projectsBuilt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A small SVG line chart: 2px lines, 8px+ markers, recessive grid, tap for values.

interface Series {
  key: string;
  label: string;
  color: string;
  shape: 'circle' | 'square';
  values: number[];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(480);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function LineChart({
  n, yMin, yMax, yTicks, series, sel, onSel, format,
}: {
  n: number;
  yMin: number;
  yMax: number;
  yTicks: { v: number; label: string; icon?: string }[];
  series: Series[];
  sel: number | null;
  onSel: (i: number) => void;
  format: (series: string, v: number) => string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const h = 240;
  const pad = { l: 48, r: 72, t: 16, b: 34 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * w;
    const i = n === 1 ? 0 : Math.round(((px - pad.l) / iw) * (n - 1));
    onSel(Math.max(0, Math.min(n - 1, i)));
  };
  const xTicks = Array.from({ length: n }, (_, i) => i).filter((i) => n <= 12 || i % Math.ceil(n / 12) === 0 || i === n - 1);

  return (
    <div ref={ref} className="chart">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={series.map((s) => s.label).join(', ')}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget)}>
        {yTicks.map((t) => (
          <g key={t.v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t.v)} y2={y(t.v)} className="chart__grid" />
            {t.icon ? (
              <image href={`${import.meta.env.BASE_URL}assets/sm/${t.icon}.webp`} x={4} y={y(t.v) - 16} width={32} height={32} />
            ) : (
              <text x={pad.l - 10} y={y(t.v)} className="chart__tick" textAnchor="end" dominantBaseline="middle">{t.label}</text>
            )}
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={h - 8} className="chart__tick" textAnchor="middle">{i + 1}</text>
        ))}
        {sel !== null && <line x1={x(sel)} x2={x(sel)} y1={pad.t} y2={pad.t + ih} className="chart__cross" />}
        {series.map((s) => (
          <g key={s.key}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {s.values.map((v, i) =>
              s.shape === 'circle' ? (
                <circle key={i} cx={x(i)} cy={y(v)} r={sel === i ? 7 : 5} fill={s.color} stroke="var(--cream)" strokeWidth={2} />
              ) : (
                <rect key={i} x={x(i) - (sel === i ? 7 : 5)} y={y(v) - (sel === i ? 7 : 5)} width={sel === i ? 14 : 10} height={sel === i ? 14 : 10} rx={2} fill={s.color} stroke="var(--cream)" strokeWidth={2} />
              ),
            )}
            {series.length > 1 && (
              <text x={x(s.values.length - 1) + 12} y={y(s.values[s.values.length - 1])} className="chart__direct" dominantBaseline="middle">
                {s.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {sel !== null && (
        <div className="chart__tip" style={{ left: Math.min(Math.max(x(sel), 80), w - 80) }}>
          <b className="num">#{sel + 1}</b>
          {series.map((s) => (
            <span key={s.key}>
              <i className={`chart__swatch chart__swatch--${s.shape}`} style={{ background: s.color }} />
              {format(s.label, s.values[sel])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export

async function shareCsv(game: Game) {
  const date = new Date().toISOString().slice(0, 10);
  const name = `boom-bust-record-${date}.csv`;
  const file = new File([recordCsv(game)], name, { type: 'text/csv' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Boom & Bust record' });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // the player closed the share sheet
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV saved');
}
