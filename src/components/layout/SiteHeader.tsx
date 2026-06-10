import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAstra, useCopy } from '@/lib/astras/AstraContext';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { HoneyDrop } from '@/components/ui/HoneyDrop';
import { UtilityChrome } from './UtilityChrome';

export function SiteHeader() {
  const { configured } = useAuth();
  const astra = useAstra();
  const wordmark = astra?.wordmark ?? 'The Manual';
  // wordmarkShort: explicit value from config, or derive from full wordmark via toUpperCase().
  // Fallback ensures AtlasINTEL.fyi (no wordmarkShort set) produces 'ATLASINTEL'.
  const wordmarkShort = astra
    ? (astra.wordmarkShort ?? astra.wordmark.toUpperCase())
    : 'The Manual';
  const accentColor = astra?.accent;

  /* data-bees-label is a verification artifact for Component B's useCopy()
     mechanism. On HoneyComb astras (and foundation), expect 'Bees'. On
     AtlasNation astras (atlasintel.fyi, atlasunited.fyi), expect 'Members'.
     The attribute is intentionally non-rendering — full lexicon swap sweep
     is queued as a separate Component B follow-up. */
  const beesLabel = useCopy('Bees');

  // BLiNG! drop hop animation. Listens for `bling-hop` events dispatched by
  // PlatformRail when the rail expands on a astra host (Read C clarification).
  // Drop is always visible; animation gated upstream by astra presence.
  const [hopping, setHopping] = useState(false);
  useEffect(() => {
    const onHop = () => {
      setHopping(false);
      // Re-enable on next frame so the same event re-triggers the keyframe.
      requestAnimationFrame(() => requestAnimationFrame(() => setHopping(true)));
      // Animation duration is 0.9s — clear flag a touch after to allow re-arm.
      const t = setTimeout(() => setHopping(false), 1000);
      return () => clearTimeout(t);
    };
    window.addEventListener('bling-hop', onHop);
    return () => window.removeEventListener('bling-hop', onHop);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md"
      data-bees-label={beesLabel}
    >
      {/* Astra accent stripe — additive on astra hosts only, invisible on themanual.tech */}
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
          {/* BLiNG! drop — brand identity (always present), astra-ID motion when rail opens */}
          <HoneyDrop size={14} hopping={hopping} className="ml-0.5" />
        </Link>

        <div className="flex-1" />

        {/* Right: utility chrome (search · notif · msg · cart · BLiNG! · profile · [mobile surfaces]) */}
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
