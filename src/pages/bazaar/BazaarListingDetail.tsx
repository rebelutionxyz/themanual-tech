import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ImageOff, Loader2, X } from 'lucide-react';
import {
  type BazaarListing,
  bazaarListingGet,
  bazaarPurchaseBling,
  formatBling,
  formatFiat,
} from '@/lib/bazaar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BAZAAR_ACCENT } from '@/components/bazaar/cards';

export function BazaarListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { bee } = useAuth();

  const [listing, setListing] = useState<BazaarListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveImage(0);
    bazaarListingGet(id)
      .then((l) => {
        if (!cancelled) {
          setListing(l);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load offer');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 md:px-8">
      <Link
        to="/bazaar"
        className="inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} /> Back to Bazaar
      </Link>

      {loading ? (
        <p className="mt-8 font-mono text-zinc-500" style={{ fontSize: '13px' }}>
          Loading…
        </p>
      ) : error ? (
        <p className="mt-8 font-mono text-red-600" style={{ fontSize: '13px' }}>
          {error}
        </p>
      ) : !listing ? (
        <p className="mt-8 font-mono text-zinc-500" style={{ fontSize: '13px' }}>
          This offer doesn’t exist or was removed.
        </p>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Gallery
            images={listing.imageUrls}
            active={activeImage}
            onSelect={setActiveImage}
            title={listing.title}
          />
          <Details listing={listing} viewerBeeId={bee?.id ?? null} />
        </div>
      )}
    </div>
  );
}

function Gallery({
  images,
  active,
  onSelect,
  title,
}: {
  images: string[];
  active: number;
  onSelect: (i: number) => void;
  title: string;
}) {
  const main = images[active] ?? null;
  return (
    <div>
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        {main ? (
          <img src={main} alt={title} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={40} className="text-zinc-300" aria-hidden="true" />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Image ${i + 1}`}
              className={cn(
                'h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                i === active ? '' : 'border-transparent hover:border-zinc-300',
              )}
              style={i === active ? { borderColor: BAZAAR_ACCENT } : undefined}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Details({ listing, viewerBeeId }: { listing: BazaarListing; viewerBeeId: string | null }) {
  return (
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-semibold leading-tight text-zinc-900">
        {listing.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {listing.priceBling != null && (
          <span className="font-display text-2xl font-bold" style={{ color: BAZAAR_ACCENT }}>
            {formatBling(listing.priceBling)} BLiNG!
          </span>
        )}
        {listing.acceptsFiat && listing.priceCents != null && (
          <span className="font-mono text-zinc-500" style={{ fontSize: '13px' }}>
            {listing.priceBling != null ? `or ${formatFiat(listing.priceCents)}` : formatFiat(listing.priceCents)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {listing.condition && <Chip className="capitalize">{listing.condition}</Chip>}
        <Chip>Qty {listing.quantity}</Chip>
        {listing.status !== 'active' && <Chip tone="muted">{listing.status}</Chip>}
      </div>

      <div className="mt-3 font-mono text-zinc-500" style={{ fontSize: '12px' }}>
        Offered by <span className="text-zinc-700">@{listing.seller.handle}</span>
      </div>

      {listing.description && (
        <p className="mt-4 whitespace-pre-wrap text-zinc-700" style={{ fontSize: '14px', lineHeight: 1.6 }}>
          {listing.description}
        </p>
      )}

      <div className="mt-6">
        <BuySection listing={listing} viewerBeeId={viewerBeeId} />
      </div>
    </div>
  );
}

function Chip({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'muted';
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 font-mono',
        tone === 'muted'
          ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
          : 'border-zinc-200 bg-white text-zinc-600',
        className,
      )}
      style={{ fontSize: '11px' }}
      data-size="meta"
    >
      {children}
    </span>
  );
}

function BuySection({ listing, viewerBeeId }: { listing: BazaarListing; viewerBeeId: string | null }) {
  const [confirming, setConfirming] = useState(false);

  const isOwner = viewerBeeId != null && viewerBeeId === listing.seller.offeredBy;
  const sellable = listing.status === 'active' && listing.quantity > 0;
  const canBuyBling = listing.acceptsBling && listing.priceBling != null;
  const fiatOnly = listing.acceptsFiat && !listing.acceptsBling;

  if (isOwner) {
    return <Note>This is your listing.</Note>;
  }
  if (!sellable) {
    return <Note>This offer is no longer available.</Note>;
  }
  if (canBuyBling) {
    if (!viewerBeeId) {
      return (
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold text-white"
          style={{ background: BAZAAR_ACCENT, fontSize: '14px' }}
        >
          Sign in to GET
        </Link>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: BAZAAR_ACCENT, fontSize: '14px' }}
        >
          GET for {formatBling(listing.priceBling)} BLiNG!
        </button>
        {confirming && (
          <PurchaseModal listing={listing} onClose={() => setConfirming(false)} />
        )}
      </>
    );
  }
  if (fiatOnly) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 font-medium text-zinc-400"
        style={{ fontSize: '14px' }}
      >
        Fiat checkout coming soon
      </button>
    );
  }
  return <Note>This offer has no GET option set.</Note>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }} data-size="meta">
      {children}
    </p>
  );
}

function PurchaseModal({ listing, onClose }: { listing: BazaarListing; onClose: () => void }) {
  const [state, setState] = useState<'confirm' | 'buying' | 'done'>('confirm');
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setState('buying');
    setError(null);
    try {
      await bazaarPurchaseBling(listing.id);
      setState('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
      setState('confirm');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
      // biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal(); this overlay is mounted declaratively
      role="dialog"
      aria-modal="true"
      aria-label="Confirm purchase"
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-zinc-900">
            {state === 'done' ? 'Sent!' : 'Confirm'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={16} />
          </button>
        </div>

        {state === 'done' ? (
          <div className="mt-3">
            <div
              className="flex items-center gap-2 font-medium"
              style={{ color: BAZAAR_ACCENT, fontSize: '14px' }}
            >
              <Check size={18} /> {formatBling(listing.priceBling)} BLiNG! sent to @
              {listing.seller.handle}.
            </div>
            <Link
              to="/bazaar/orders"
              className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold text-white"
              style={{ background: BAZAAR_ACCENT, fontSize: '14px' }}
            >
              View your orders
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-zinc-700" style={{ fontSize: '14px', lineHeight: 1.5 }}>
              Send {formatBling(listing.priceBling)} BLiNG! to{' '}
              <span className="font-semibold">@{listing.seller.handle}</span> for «{listing.title}»?
            </p>
            {error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-red-600" style={{ fontSize: '13px' }}>
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={state === 'buying'}
                className="rounded-md border border-zinc-200 px-3 py-2 font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={buy}
                disabled={state === 'buying'}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: BAZAAR_ACCENT, fontSize: '13px' }}
              >
                {state === 'buying' && <Loader2 size={14} className="animate-spin" />}
                Send BLiNG!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
