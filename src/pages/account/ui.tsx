import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Shared white-shell presentational atoms for the ACCOUNT hub (PROFILE1).
 * The hub lives in the community white shell, so every tab reads in the
 * zinc/amber vocabulary of HandleSettingsPage / BazaarOrders — never the black
 * platform tokens. Legible over clever: plain cards, plain labels.
 */

/** Uppercase mono field label — the meta caption used across the white shell. */
export function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-zinc-500" style={{ fontSize: '11px' }} data-size="meta">
      {children}
    </p>
  );
}

/** A titled card block. `icon` sits in an accent-tinted square, like BazaarOrders. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-zinc-200 bg-white p-5', className)}>
      {children}
    </div>
  );
}

/** Section heading inside a tab — a small accent title + optional hint line. */
export function SectionHead({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-zinc-900">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-zinc-500" style={{ fontSize: '12px' }}>
            {hint}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

/** Empty / loading / error line — dashed box, centered, mono. */
export function StateLine({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: 'error';
}) {
  return (
    <div
      className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center font-mono"
      style={{ fontSize: '12px' }}
    >
      <span className={tone === 'error' ? 'text-red-600' : 'text-zinc-500'}>{children}</span>
    </div>
  );
}

/** A labelled key→value line for the profile/settings read views. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <MetaLabel>{label}</MetaLabel>
      <div className="text-zinc-900" style={{ fontSize: '14px' }}>
        {children}
      </div>
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO → "D Mon YYYY" (empty string on a bad/absent date). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** ISO → "D Mon" (compact, for dense timelines). */
export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
