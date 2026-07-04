import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { type BazaarListing, formatBling, formatFiat } from '@/lib/bazaar';
import { CARD_INK, cardChipStyle, realmCardStyle } from '@/lib/realmCardStyle';

/**
 * BAZAAR / marketplace accent — the per-surface constant (PULSE's lives in its
 * cards.tsx as PULSE_RED; this is the bazaar equivalent). Maroon: used for
 * active states, price emphasis (on light backgrounds), and primary buttons.
 */
export const BAZAAR_ACCENT = '#9F1239';

const CARD_CLASS =
  'group block overflow-hidden rounded-lg transition-shadow hover:shadow-md';

/** Browse-grid listing card — deep maroon fill (realmCardStyle) + light ink. */
export function ListingCard({ listing }: { listing: BazaarListing }) {
  const img = listing.imageUrls[0] ?? null;
  return (
    <Link
      to={`/bazaar/${listing.id}`}
      className={CARD_CLASS}
      style={realmCardStyle(BAZAAR_ACCENT)}
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-black/25">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff size={28} style={{ color: 'rgba(255,255,255,0.4)' }} aria-hidden="true" />
        )}
      </div>
      <div className="p-3">
        <h3
          className="line-clamp-2 font-display text-base leading-tight"
          style={{ color: CARD_INK.title }}
        >
          {listing.title}
        </h3>
        <div className="mt-1.5">
          <ListingPrice listing={listing} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {listing.condition && (
            <span
              className="rounded px-1.5 py-0.5 font-mono capitalize"
              style={{ fontSize: '10px', ...cardChipStyle }}
              data-size="meta"
            >
              {listing.condition}
            </span>
          )}
          <span className="font-mono" style={{ fontSize: '11px', color: CARD_INK.meta }} data-size="meta">
            @{listing.seller.handle}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Price block — BLiNG! primary (secondary fiat only when accepts_fiat); fiat-only
    falls back to the fiat figure. On the maroon card the emphasis is light/bold. */
export function ListingPrice({ listing }: { listing: BazaarListing }) {
  if (listing.priceBling != null) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className="font-display font-semibold"
          style={{ fontSize: '15px', color: CARD_INK.title }}
        >
          {formatBling(listing.priceBling)} BLiNG!
        </span>
        {listing.acceptsFiat && listing.priceCents != null && (
          <span className="font-mono" style={{ fontSize: '11px', color: CARD_INK.meta }}>
            {formatFiat(listing.priceCents)}
          </span>
        )}
      </div>
    );
  }
  if (listing.priceCents != null) {
    return (
      <span
        className="font-display font-semibold"
        style={{ fontSize: '15px', color: CARD_INK.title }}
      >
        {formatFiat(listing.priceCents)}
      </span>
    );
  }
  return null;
}
