import { ManualLogo } from '@/components/ui/ManualLogo';
import { useAstra, useCopy } from '@/lib/astras/AstraContext';
import { useAuth } from '@/lib/auth';
import { SPINE_BLACK } from '@/lib/spine';
import { Link, useLocation } from 'react-router-dom';
import { RoomsButton } from './RoomsButton';
import { UtilityChrome } from './UtilityChrome';

/* THE h24 SURFACE WEARS ITS OWN WORDMARK — FRONT78, owner: "its h24.tech not
   themanual". `/h24` and the two paths that answer to it (ORACLE_MF v1.24 keeps
   `/oracle` live as the legacy path and `/here24` as the rename's redirect) show
   `h24.tech` in the top bar; every other route still reads TheMANUAL.tech.

   DISPLAY ONLY. The h24.tech DOMAIN stays DARK per v1.24 — no DNS, no deploy
   config, no host change of any kind. This is a string in a header, and calling
   it anything more would be a lie about what shipped. */
const H24_PATHS = new Set(['/h24', '/oracle', '/here24']);

export function SiteHeader() {
  const { configured } = useAuth();
  const astra = useAstra();
  const { pathname } = useLocation();

  // Matched on the FIRST SEGMENT, not the whole path: /h24 has child routes and
  // an exact-match test would drop the wordmark the moment a reader went one
  // level deeper into the same surface.
  const onH24 = H24_PATHS.has(`/${pathname.split('/').filter(Boolean)[0] ?? ''}`);

  // An astra host still wins over both: on a real astra the header is that
  // astra's, and h24 is not the surface being visited.
  const wordmark = astra?.wordmark ?? (onH24 ? 'h24.tech' : 'TheMANUAL.tech');
  // wordmarkShort: explicit value from config, or derive from full wordmark via toUpperCase().
  // Fallback ensures AtlasINTEL.fyi (no wordmarkShort set) produces 'ATLASINTEL'.
  const wordmarkShort = astra
    ? (astra.wordmarkShort ?? astra.wordmark.toUpperCase())
    : onH24
      ? 'h24.tech'
      : 'TheMANUAL.tech';
  const accentColor = astra?.accent;

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
        <span aria-hidden className="block h-0.5 w-full" style={{ background: accentColor }} />
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

        {/* THE DROP IS RETIRED — FRONT78, owner: "its h24.tech not themanual we
            dont need the bling drop". It sat here for exactly one pass and never
            shipped. `HoneyDrop` itself lives on: it is still the BLiNG! mark in
            LensRow, Bookmarks, Studio and elsewhere. What went is the SPINE
            drop, its hop, and the `bling-hop` event that drove it. */}

        {/* THE ROOMS BUTTON — FRONT80. Platform chrome in the left cluster
            (H24 DESIGN SPEC v0.7). On-demand names-only transport between the
            live astras; it appears wherever SiteHeader does, /h24 included. */}
        <RoomsButton />

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
