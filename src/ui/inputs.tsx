// Picture inputs: dice faces and a number pad (dice and cards are physical; players tap what they see).
import { Btn } from './kit';
import './money.css';

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

export function Die({
  value, on, lose, size, onClick, disabled,
}: { value: number; on?: boolean; lose?: boolean; size?: number; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`die${on ? ' is-on' : ''}${lose ? ' is-lose' : ''}`}
      style={size ? ({ '--size': `${size}px` } as React.CSSProperties) : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={String(value)}
      aria-pressed={on}
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        {PIPS[value].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9.5} fill="var(--navy)" />
        ))}
      </svg>
    </button>
  );
}

/** Six dice faces to tap. `loseMax` marks faces that lose a job in red. */
export function DieRow({ value, onPick, loseMax, size }: { value: number | null; onPick: (n: number) => void; loseMax?: number; size?: number }) {
  return (
    <div className="die-row" style={{ display: 'flex', gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Die key={n} value={n} size={size} on={value === n} lose={loseMax !== undefined && n <= loseMax} onClick={() => onPick(n)} />
      ))}
    </div>
  );
}

/** A dollar number pad for bids and counted cash. */
export function NumberPad({ value, onChange, max = 99990 }: { value: number; onChange: (n: number) => void; max?: number }) {
  const press = (d: number) => {
    const next = value * 10 + d;
    if (next <= max) onChange(next);
  };
  return (
    <div className="pad">
      <div className="pad__show num">${value.toLocaleString('en-AU')}</div>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <Btn key={d} tone="ghost" onClick={() => press(d)}>
          {d}
        </Btn>
      ))}
      <Btn tone="ghost" onClick={() => onChange(0)} aria-label="Clear">
        C
      </Btn>
      <Btn tone="ghost" onClick={() => press(0)}>
        0
      </Btn>
      <Btn tone="ghost" onClick={() => onChange(Math.floor(value / 10))} aria-label="Delete">
        ⌫
      </Btn>
    </div>
  );
}
