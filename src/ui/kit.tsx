import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { DATA, notesFor } from '../engine';
import { useGame } from '../store';
import { NOTE_ART, TOKEN_NAME } from './labels';
import './ui.css';

const ECON_ICON = Object.fromEntries(DATA.economy.map((e) => [e.key, e.icon]));
export const econIcon = (key: string) => ECON_ICON[key];

export function artUrl(id: string, size: 'sm' | 'lg' = 'sm') {
  return `${import.meta.env.BASE_URL}assets/${size}/${id}.webp`;
}

export function Art({
  id, size = 'sm', alt, className, style, onClick,
}: { id: string; size?: 'sm' | 'lg'; alt?: string; className?: string; style?: CSSProperties; onClick?: () => void }) {
  return (
    <img
      src={artUrl(id, size)}
      alt={alt ?? id}
      className={className}
      style={style}
      draggable={false}
      decoding="async"
      onClick={onClick}
    />
  );
}

/** A player's piece as a round avatar. Without `size`, CSS sizes it. */
export function Token({ token, size, current, className }: { token: string; size?: number; current?: boolean; className?: string }) {
  return (
    <span className={`token${current ? ' token--current' : ''}${className ? ` ${className}` : ''}`} style={size ? { width: size, height: size } : undefined}>
      <Art id={token} alt={TOKEN_NAME[token]} />
    </span>
  );
}

/** A signed amount: green +$90 for money received, coral -$70 for money paid. */
export function Money({ amount, big, plain }: { amount: number; big?: boolean; plain?: boolean }) {
  const sign = plain ? '' : amount > 0 ? '+' : amount < 0 ? '-' : '';
  const tone = plain ? '' : amount > 0 ? ' money--in' : amount < 0 ? ' money--out' : '';
  return <span className={`money num${big ? ' money--big' : ''}${tone}`}>{`${sign}$${Math.abs(amount).toLocaleString('en-AU')}`}</span>;
}

/** The fewest paper notes that make an amount (switchable in the teacher menu). */
export function Notes({ amount, force }: { amount: number; force?: boolean }) {
  const on = useGame().settings.noteHelper;
  if ((!on && !force) || amount <= 0) return null;
  let notes: { note: number; count: number }[];
  try {
    notes = notesFor(amount);
  } catch {
    return null;
  }
  return (
    <span className="notes" aria-label={`$${amount} in notes`}>
      {notes.map(({ note, count }) => (
        <span key={note} className="notes__item">
          <Art id={NOTE_ART[note]} alt={`$${note}`} />
          {count > 1 && <b className="num">×{count}</b>}
        </span>
      ))}
    </span>
  );
}

type Tone = 'teal' | 'navy' | 'coral' | 'mustard' | 'green' | 'purple' | 'ghost';

export function Btn({
  tone = 'navy', big, wide, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean; wide?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn--${tone}${big ? ' btn--big' : ''}${wide ? ' btn--wide' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A full-screen sheet over the main screen: always upright, big images, big buttons. */
export function Sheet({
  icon, title, onClose, children, footer, tone,
}: { icon?: string; title?: ReactNode; onClose?: () => void; children: ReactNode; footer?: ReactNode; tone?: 'teal' | 'purple' }) {
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`sheet${tone ? ` sheet--${tone}` : ''}`}>
        {(icon || title || onClose) && (
          <header className="sheet__head">
            {icon && <Art id={icon} className="sheet__icon" alt="" />}
            {title && <h2 className="sheet__title">{title}</h2>}
            {onClose && (
              <button type="button" className="sheet__close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            )}
          </header>
        )}
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/** A count chip: a small picture with a number or amount. */
export function Chip({ icon, children, title }: { icon: string; children?: ReactNode; title?: string }) {
  return (
    <span className="chip" title={title}>
      <Art id={icon} alt={title ?? ''} />
      {children !== undefined && <b className="num">{children}</b>}
    </span>
  );
}

// ---------- Toast ----------

let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => pushToast(msg);

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    pushToast = (text) => setMsg((m) => ({ text, n: (m?.n ?? 0) + 1 }));
    return () => {
      pushToast = () => {};
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? (
    <div className="toast" role="status" key={msg.n}>
      {msg.text}
    </div>
  ) : null;
}
