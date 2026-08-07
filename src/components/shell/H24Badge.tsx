/* FRONT21 — the h24 spine badge.
   ORACLE_MF v1.23 restored the spine truth: h24 (AtlasOracle rebranded, v1.22)
   is NOT a sidebar entry. It is a SPINE element — a small AI badge in the
   header of EVERY Astra, riding the chrome of every room without being a room.
   MMF §7.2 / §12.1, Cat 3 since Apr 26.

   The mark is the BUTTERFLY from H24_GESTURES v1.0: palms pressed, the seam is
   the spine, four fingers fan outward each side — twenty-four bones, one
   creature. At rest a prayer, open a butterfly.

   WHERE THIS DOES *NOT* GO: the black shell's SiteHeader. UtilityChrome there
   already mounts AtlasOracleWalletBadge — the full v1.23 element, badge plus
   wallet popover. FRONT21 fills the headers that had NO AI element at all: the
   white community shell (LensRow) and MiniWaves. Two badges in one bar would be
   worse than the gap.

   Shell-first scope: this badge navigates to the h24 Astra route rather than
   opening the wallet. When AtlasOracleWalletBadge settles (it is in flight in a
   parallel pass), mounting IT in these two places is the correct replacement —
   this component is the anchor point, not the destination. */
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/** The h24 route. Canonical path chosen in FRONT21; /here24 answers as alias. */
export const H24_ROUTE = '/h24';

/** Provisional h24 accent — mirrors the atlasoracle entry in the Astra catalog. */
export const H24_ACCENT = '#8B7FD4';

function ButterflyMark({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* The seam — joined palms, the spine of the creature. */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Two wings, fanned open (flight state). */}
      <path
        d="M11 7c-3.4-2.6-7.2-1.4-8 1.6-.7 2.7 1.6 4.2 3.6 4.2-1.6.8-2.4 2.4-1.6 3.8.9 1.6 3.6 1.8 6 -1.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 7c3.4-2.6 7.2-1.4 8 1.6.7 2.7-1.6 4.2-3.6 4.2 1.6.8 2.4 2.4 1.6 3.8-.9 1.6-3.6 1.8-6 -1.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface H24BadgeProps {
  /**
   * Ink for the mark + label. Defaults to the h24 accent (the black shell).
   * The white community shell passes the contrast ink of its accent bar so the
   * badge flips with every other control in that row.
   */
  ink?: string;
  /** Hover wash — true on a dark bar, false on a light one. */
  onDark?: boolean;
  /** Hide the "h24" wordlet below md; the mark alone still reads. */
  compactLabel?: boolean;
  className?: string;
}

export function H24Badge({ ink, onDark = true, compactLabel = true, className }: H24BadgeProps) {
  const color = ink ?? H24_ACCENT;
  return (
    <Link
      to={H24_ROUTE}
      title="h24 — the AI that rides every room"
      aria-label="h24"
      data-h24-badge=""
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
        onDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
        className,
      )}
      style={{ color }}
    >
      <ButterflyMark color={color} />
      <span
        className={cn('font-mono tracking-wider', compactLabel && 'hidden md:inline')}
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        h24
      </span>
    </Link>
  );
}
