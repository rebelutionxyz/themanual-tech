/* DingleBERRY — shared primitives, re-skinned to the repo's dark Manual tokens.
   These replace the artifact's window.TLW design-system (Card / Badge / etc.).
   Tone colors come from tone.ts; structure comes from the repo (Tailwind tokens,
   font-serif/sans/mono). */
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/dingleberry/contract';
import { dbIcon } from './icons';
import { DINGLEBERRY_COLOR, TONE } from './tone';

/* ---- a security-severity pill, mono / uppercase ---- */
export function StatusPill({
  tone = 'secure',
  children,
  pulse,
}: {
  tone?: Tone;
  children?: ReactNode;
  pulse?: boolean;
}) {
  const k = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-semibold uppercase"
      style={{
        height: 22,
        padding: '0 10px',
        fontSize: 11,
        letterSpacing: '0.08em',
        borderRadius: 999,
        lineHeight: 1,
        color: k.c,
        background: k.tint,
        border: `1px solid ${k.border}`,
      }}
    >
      <span
        className={cn('block flex-none rounded-full', pulse && 'animate-pulse')}
        style={{ width: 6, height: 6, background: k.c }}
      />
      {children ?? k.label}
    </span>
  );
}

/* ---- deterministic sparkline (verbatim seed math from the artifact) ---- */
export function Spark({
  seed,
  tone = 'secure',
  w = 132,
  h = 30,
}: {
  seed: number;
  tone?: Tone;
  w?: number;
  h?: number;
}) {
  let s = (seed * 2654435761) % 2147483647;
  // biome-ignore lint/suspicious/noAssignInExpressions: verbatim deterministic LCG from the artifact — the in-expression assignment IS the generator step
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = 22;
  let y = h / 2;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const amp = tone === 'critical' ? 9 : tone === 'watch' ? 6 : 3.2;
    y += (rnd() - 0.5) * amp;
    if (tone === 'critical' && i > 15) y += 1.4;
    y = Math.max(3, Math.min(h - 3, y));
    pts.push(`${((i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      role="img"
      aria-label="activity trend"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={TONE[tone].c}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

/* ---- panel card (replaces TLW Card) ---- */
export function DbCard({
  children,
  className,
  style,
  interactive,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'rounded-lg border border-border bg-bg-panel',
        interactive && 'cursor-pointer transition-colors hover:border-border-bright',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/* ---- mono eyebrow label ---- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('font-mono uppercase text-text-muted', className)}
      style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em' }}
    >
      {children}
    </div>
  );
}

/* ---- inert enforcement-action button (mock).
   Renders the artifact's action affordances for structural fidelity but with NO
   handler — mutations wire in Step 4 (post security audit). Callers pair a group
   of these with a "wire in Step 4" caption. ---- */
export function ActionButton({
  variant,
  icon,
  children,
}: {
  variant: 'primary' | 'danger' | 'secondary' | 'ghost';
  icon?: string;
  children: ReactNode;
}) {
  const Icon = icon ? dbIcon(icon) : null;
  const styles: Record<string, CSSProperties> = {
    primary: { color: 'var(--text-silver-bright, #E0E6EC)', background: 'var(--bg-panel2, #14171C)', border: '1px solid var(--border-bright, #2A3138)' },
    danger: { color: DINGLEBERRY_COLOR, background: 'rgba(220,38,38,0.12)', border: `1px solid ${TONE.critical.border}` },
    secondary: { color: 'var(--text-silver, #C8D1DA)', background: 'transparent', border: '1px solid var(--border-bright, #2A3138)' },
    ghost: { color: 'var(--text-muted, #6B7580)', background: 'transparent', border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-md font-sans font-semibold"
      style={{ height: 38, fontSize: 13, ...styles[variant] }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ---- caption under an inert action group ---- */
export function ActionCaption() {
  return (
    <div className="text-center font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
      Enforcement actions wire in Step 4 · post security audit
    </div>
  );
}
