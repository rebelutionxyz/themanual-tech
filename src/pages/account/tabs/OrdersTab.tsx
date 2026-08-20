import { type BazaarOrder, bazaarMyOrders } from '@/lib/bazaar';
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHead, StateLine } from '../ui';
import { OrderRow } from './orderRow';

/** ORDERS — things the member GOT (buyer). Read-only; manage on /bazaar/orders. */
export function OrdersTab() {
  const [rows, setRows] = useState<BazaarOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bazaarMyOrders()
      .then((r) => !cancelled && setRows(r))
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your orders');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <SectionHead
        title="Orders"
        hint="Everything you GOT from the Bazaar."
        right={
          <Link
            to="/bazaar/orders"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50"
            style={{ fontSize: '12px' }}
          >
            <Package size={12} /> Manage
          </Link>
        }
      />
      {error ? (
        <StateLine tone="error">{error}</StateLine>
      ) : rows === null ? (
        <StateLine>Loading…</StateLine>
      ) : rows.length === 0 ? (
        <StateLine>
          No orders yet.{' '}
          <Link to="/bazaar" className="underline">
            Explore the Bazaar.
          </Link>
        </StateLine>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => (
            <OrderRow
              key={o.orderId}
              listingId={o.listingId}
              image={o.listingImage}
              title={o.listingTitle}
              partyPrefix="from"
              partyLabel={`@${o.sellerHandle}`}
              blingPaid={o.blingPaid}
              status={o.status}
              createdAt={o.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
