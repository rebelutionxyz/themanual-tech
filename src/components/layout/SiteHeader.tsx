import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAstra, useCopy } from '@/lib/astras/AstraContext';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { HoneyDrop } from '@/components/ui/HoneyDrop';
import { useBlingHop } from '@/hooks/useSpine';
import { SPINE_BLACK } from '@/lib/spine';
import { UtilityChrome } from './UtilityChrome';

export function SiteHeader() {
  const { configured } = useAuth();
  const astra = useAstra();
  const wordmark = astra?.wordmark ?? 'TheMANUAL.tech';
  // wordmarkShort: explicit value from config, or derive from full wordmark via toUpperCase().
  // Fallback ensures AtlasINTEL.fyi (no wordmarkShort set) produces 'ATLASINTEL'.
  const wordmarkShort = astra
    ? (astra.wordmarkShort ?? astra.wordmark.toUpperCase())
    : 'TheMANUAL.tech';
  const accentColor = astra?.accent;

  /* SPINE 5 — the drop hops on sidebar open. The hook owns the
     prefers-reduced-motion check and returns a permanent false for a viewer who
     asked for less motion, so there is no second place to get that wrong. */
  const hopping = useBlingHop();

  /* data-bees-label is a verification artifact for Component B's useCopy()
     mechanism. On HoneyComb astras (and foundation), expect 'Bees'. On
     AtlasNation astras (atlasintel.fyi, atlasunited.fyi), expect 'Members'.
     The attribute is intentionally non-rendering — full lexicon swap sweep
     is queued as a separate Component B follow-up.

     FRONT74 note: 'Bees' here is a LEXICON KEY, not displayed copy, so the
     ORACLE_MF v1.27 users-not-Bees sweep does not touch it. Renaming the key
     would break every lexicon map that answers to it. */
  const beesLabel = useCopy('Bees');

  return (
    <header
      /* SPINE 1 — THE TOP BAR IS ALWAYS BLACK. Opaque, and an explicit value
         rather than the `bg` token: the previous `bg-bg/95 backdrop-blur-md`
         let whatever scrolled beneath tint the bar, which is the one thing the
         design forbids ("no exceptions, no realm tinting of the bar itself").
         The blur went with it — there is nothing left to blur through. */
      className="sticky top-0 z-40 border-b border-border"
      style={{ background: SPINE_BLACK }}
      data-spine="top-bar"
      data-bees-label={beesLabel}
    >
      {/* Astra accent stripe — additive on astra hosts only, invisible on
          themanual.tech. This is a hairline ABOVE the bar, not a tint OF it, so
          it survives spine rule 1; flagged in the FRONT74 report as the one
          place a reader could reasonably argue the rule is being bent. */}
      {accentColor && (
        <span
          aria-hidden
          className="block h-0.5 w-full"
          style={{ background: accentColor }}
        />
      )}
      <div className="safe-pad-x flex h-14 items-center gap-3 px-4 md:px-6">
        {/* Logo + wordmark (clickable, goes home) */}
        <Link
          to="/"
          className="group flex flex-shrink-0 items-center gap-2.5 no-drag"
          aria-label="Home"
        >
          <ManualLogo size={28} className="transition-opacity group-hover:opacity-90" />
          {/* Expanded wordmark — visible at sm+ breakpoint */}
          <span className="hidden font-display text-lg font-semibold tracking-wide text-text-silver-bright sm:inline">
            {wordmark}
          </span>
          {/* Condensed wordmark — visible below sm breakpoint (collapsed / mobile menu context) */}
          <span className="font-display text-sm font-semibold tracking-widest text-text-silver-bright sm:hidden">
            {wordmarkShort}
          </span>
        </Link>

        {/* SPINE 5 — THE DROP. Honey, RIGHT OF THE WORDMARK, hops-skips-jumps on
            sidebar open. Outside the Link above on purpose: the drop is a spine
            element, not part of the home affordance, and swallowing it into the
            logo hit-target would make it a navigation control it is not. */}
        <HoneyDrop
          size={15}
          hopping={hopping}
          className="flex-shrink-0"
          data-spine="drop"
        />

        <div className="flex-1" />

        {/* Right: utility chrome (search · notif · msg · cart · BLiNG! · profile · [mobile surfaces])
            h24 SPINE BADGE rides in here — UtilityChrome mounts
            AtlasOracleWalletBadge, which IS the v1.23 spine badge. FRONT75 owns
            its treatment; FRONT74 deliberately adds no second badge. */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {!configured && (
            <span
              className="hidden font-mono text-text-muted lg:inline"
              style={{ fontSize: '11px' }}
              data-size="meta"
              title="Supabase env vars not set"
            >
              read-only mode
            </span>
          )}
          <UtilityChrome />
        </div>
      </div>
    </header>
  );
}
