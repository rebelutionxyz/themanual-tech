import { type BazaarListing, type BazaarSale, bazaarMyListings, bazaarMySales } from '@/lib/bazaar';
import { Plus, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { SectionHead, StateLine } from '../ui';
import { OrderRow } from './orderRow';

/**
 * SALES — what the member OFFERs and has sold (seller). Two read-only lists:
 * incoming orders (bazaar_my_sales) and live OFFERs (bazaar_my_listings).
 * Fulfilment actions stay on /bazaar/orders (propose-first floor).
 */
export function SalesTab() {
  const [sales, setSales] = useState<BazaarSale[] | null>(null);
  const [listings, setListings] = useState<BazaarListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bazaarMySales()
      .then((r) => !cancelled && setSales(r))
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your sales');
      });
    bazaarMyListings()
      .then((r) => !cancelled && setListings(r))
      .catch(() => !cancelled && setListings([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionHead
          title="Incoming orders"
          hint="What other members GOT from you."
          right={
            <Link
              to="/bazaar/orders"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50"
              style={{ fontSize: '12px' }}
            >
              Manage
            </Link>
          }
        />
        {error ? (
          <StateLine tone="error">{error}</StateLine>
        ) : sales === null ? (
          <StateLine>Loading…</StateLine>
        ) : sales.length === 0 ? (
          <StateLine>No sales yet.</StateLine>
        ) : (
          <div className="space-y-2">
            {sales.map((o) => (
              <OrderRow
                key={o.orderId}
                listingId={o.listingId}
                image={o.listingImage}
                title={o.listingTitle}
                partyPrefix="to"
                partyLabel={`@${o.buyerHandle}`}
                blingPaid={o.blingPaid}
                status={o.status}
                createdAt={o.createdAt}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHead
          title="My OFFERs"
          hint="Your live listings on the Bazaar."
          right={
            <Link
              to="/bazaar/new"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50"
              style={{ fontSize: '12px' }}
            >
              <Plus size={12} /> New OFFER
            </Link>
          }
        />
        {listings === null ? (
          <StateLine>Loading…</StateLine>
        ) : listings.length === 0 ? (
          <StateLine>
            No OFFERs yet.{' '}
            <Link to="/bazaar/new" className="underline">
              Post your first one.
            </Link>
          </StateLine>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                  {l.imageUrls[0] ? (
                    <img src={l.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-zinc-300">
                      <Tag size={14} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/bazaar/${l.id}`}
                    className="block truncate font-medium text-zinc-900 hover:underline"
                    style={{ fontSize: '14px' }}
                  >
                    {l.title}
                  </Link>
                  <span
                    className="font-mono text-zinc-500"
                    style={{ fontSize: '10.5px' }}
                    data-size="meta"
                  >
                    {l.priceBling != null ? `${l.priceBling.toLocaleString()} BLiNG!` : ''}
                    {l.quantity > 1 ? ` · qty ${l.quantity}` : ''}
                  </span>
                </div>
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
                  style={{
                    fontSize: '9.5px',
                    background: l.status === 'active' ? `${ACCOUNT_ACCENT}18` : '#F4F4F5',
                    color: l.status === 'active' ? ACCOUNT_ACCENT : '#71717A',
                  }}
                  data-size="meta"
                >
                  {l.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
