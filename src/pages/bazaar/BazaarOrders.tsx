import { BAZAAR_ACCENT } from '@/components/bazaar/cards';
import { useAuth } from '@/lib/auth';
import {
  type BazaarListing,
  type BazaarOrder,
  type BazaarSale,
  bazaarCancelListing,
  bazaarConfirmReceived,
  bazaarMarkShipped,
  bazaarMyListings,
  bazaarMyOrders,
  bazaarMySales,
  formatBling,
} from '@/lib/bazaar';
import { cn } from '@/lib/utils';
import { ImageOff, Loader2, Package } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function BazaarOrders() {
  const { bee } = useAuth();
  const [tab, setTab] = useState<'orders' | 'sales' | 'offers'>('orders');

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 md:px-8">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
          style={{ borderColor: `${BAZAAR_ACCENT}40`, background: `${BAZAAR_ACCENT}0D` }}
        >
          <Package size={22} style={{ color: BAZAAR_ACCENT }} />
        </div>
        <div>
          <h1
            className="font-display text-3xl font-semibold tracking-wide"
            style={{ color: BAZAAR_ACCENT }}
          >
            Orders
          </h1>
          <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }}>
            What you GOT &amp; what you OFFERED
          </p>
        </div>
      </div>

      {!bee ? (
        <p
          className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600"
          style={{ fontSize: '13px' }}
        >
          <Link to="/login" className="font-semibold" style={{ color: BAZAAR_ACCENT }}>
            Sign in
          </Link>{' '}
          to see your orders and sales.
        </p>
      ) : (
        <>
          <div className="mt-6 flex gap-1 border-b border-zinc-200">
            <TabButton active={tab === 'orders'} onClick={() => setTab('orders')}>
              My Orders
            </TabButton>
            <TabButton active={tab === 'sales'} onClick={() => setTab('sales')}>
              My Sales
            </TabButton>
            <TabButton active={tab === 'offers'} onClick={() => setTab('offers')}>
              My OFFERs
            </TabButton>
          </div>
          <div className="mt-4">
            {tab === 'orders' ? <OrdersTab /> : tab === 'sales' ? <SalesTab /> : <MyOffersTab />}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 font-medium transition-colors',
        active ? '' : 'border-transparent text-zinc-500 hover:text-zinc-800',
      )}
      style={
        active
          ? { borderColor: BAZAAR_ACCENT, color: BAZAAR_ACCENT, fontSize: '14px' }
          : { fontSize: '14px' }
      }
    >
      {children}
    </button>
  );
}

// ── My Orders (buyer) ──────────────────────────────────────────────────────

function OrdersTab() {
  const [rows, setRows] = useState<BazaarOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bazaarMyOrders()
      .then((r) => !cancelled && setRows(r))
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load orders');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm(o: BazaarOrder) {
    setPending(o.orderId);
    setActionError(null);
    try {
      await bazaarConfirmReceived(o.orderId);
      setRows(
        (prev) =>
          prev?.map((r) =>
            r.orderId === o.orderId
              ? { ...r, status: 'fulfilled', fulfilledAt: new Date().toISOString() }
              : r,
          ) ?? null,
      );
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not confirm receipt');
    } finally {
      setPending(null);
    }
  }

  if (error) return <StateLine tone="error">{error}</StateLine>;
  if (rows === null) return <StateLine>Loading…</StateLine>;
  if (rows.length === 0) return <StateLine>No orders yet.</StateLine>;

  return (
    <div className="space-y-2">
      {actionError && <ActionError>{actionError}</ActionError>}
      {rows.map((o) => (
        <OrderRow
          key={o.orderId}
          listingId={o.listingId}
          image={o.listingImage}
          title={o.listingTitle}
          partyLabel={`@${o.sellerHandle}`}
          partyPrefix="from"
          blingPaid={o.blingPaid}
          status={o.status}
          createdAt={o.createdAt}
          action={
            o.status === 'paid' || o.status === 'shipped'
              ? {
                  label: 'Confirm received',
                  onClick: () => confirm(o),
                  pending: pending === o.orderId,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// ── My Sales (seller) ──────────────────────────────────────────────────────

function SalesTab() {
  const [rows, setRows] = useState<BazaarSale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bazaarMySales()
      .then((r) => !cancelled && setRows(r))
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sales');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function ship(o: BazaarSale) {
    setPending(o.orderId);
    setActionError(null);
    try {
      await bazaarMarkShipped(o.orderId);
      setRows(
        (prev) =>
          prev?.map((r) =>
            r.orderId === o.orderId
              ? { ...r, status: 'shipped', shippedAt: new Date().toISOString() }
              : r,
          ) ?? null,
      );
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not mark shipped');
    } finally {
      setPending(null);
    }
  }

  if (error) return <StateLine tone="error">{error}</StateLine>;
  if (rows === null) return <StateLine>Loading…</StateLine>;
  if (rows.length === 0) return <StateLine>No sales yet.</StateLine>;

  return (
    <div className="space-y-2">
      {actionError && <ActionError>{actionError}</ActionError>}
      {rows.map((o) => (
        <OrderRow
          key={o.orderId}
          listingId={o.listingId}
          image={o.listingImage}
          title={o.listingTitle}
          partyLabel={`@${o.buyerHandle}`}
          partyPrefix="to"
          blingPaid={o.blingPaid}
          status={o.status}
          createdAt={o.createdAt}
          action={
            o.status === 'paid'
              ? { label: 'Mark shipped', onClick: () => ship(o), pending: pending === o.orderId }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// ── Shared row ─────────────────────────────────────────────────────────────

function OrderRow({
  listingId,
  image,
  title,
  partyLabel,
  partyPrefix,
  blingPaid,
  status,
  createdAt,
  action,
}: {
  listingId: string;
  image: string | null;
  title: string;
  partyLabel: string;
  partyPrefix: string;
  blingPaid: number;
  status: string;
  createdAt: string;
  action?: { label: string; onClick: () => void; pending: boolean };
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
      <Link
        to={`/bazaar/${listingId}`}
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff size={18} className="text-zinc-300" aria-hidden="true" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/bazaar/${listingId}`}
          className="line-clamp-1 font-display text-zinc-900 hover:underline"
          style={{ fontSize: '15px' }}
        >
          {title}
        </Link>
        <div
          className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-zinc-500"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <span>
            {partyPrefix} <span className="text-zinc-700">{partyLabel}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span style={{ color: BAZAAR_ACCENT }}>{formatBling(blingPaid)} BLiNG!</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={status} />
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.pending}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
            style={{ fontSize: '12px' }}
          >
            {action.pending && <Loader2 size={12} className="animate-spin" />}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Paid' },
  shipped: { bg: '#FEF3C7', color: '#B45309', label: 'Shipped' },
  fulfilled: { bg: '#DCFCE7', color: '#15803D', label: 'Fulfilled' },
  cancelled: { bg: '#F4F4F5', color: '#71717A', label: 'Cancelled' },
  refunded: { bg: '#FEE2E2', color: '#B91C1C', label: 'Refunded' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#F4F4F5', color: '#52525B', label: status };
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono uppercase tracking-wider"
      style={{ fontSize: '10px', background: s.bg, color: s.color }}
      data-size="meta"
    >
      {s.label}
    </span>
  );
}

function StateLine({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div
      className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center font-mono"
      style={{ fontSize: '12px' }}
    >
      <span className={tone === 'error' ? 'text-red-600' : 'text-zinc-500'}>{children}</span>
    </div>
  );
}

function ActionError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-red-600" style={{ fontSize: '13px' }}>
      {children}
    </p>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── My OFFERs — the seller's own listings (bazaar_my_listings) ──

function MyOffersTab() {
  const [listings, setListings] = useState<BazaarListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    bazaarMyListings()
      .then(setListings)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load your OFFERs');
        setListings([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await bazaarCancelListing(id);
      setArmed(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdraw failed');
    } finally {
      setBusy(false);
    }
  }

  if (listings === null) return <p className="text-sm text-zinc-400">Loading…</p>;

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-600">
          {error}
        </p>
      )}
      {listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-[13px] text-zinc-500">
          No OFFERs yet.{' '}
          <Link to="/bazaar/new" className="font-semibold" style={{ color: BAZAAR_ACCENT }}>
            Post your first one.
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {listings.map((l) => {
            const active = l.status === 'active';
            return (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                  {l.imageUrls[0] && (
                    <img src={l.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/bazaar/${l.id}`}
                    className="block truncate text-[14px] font-medium text-zinc-900 hover:underline"
                  >
                    {l.title}
                  </Link>
                  <span className="font-mono text-[10.5px] text-zinc-500" data-size="meta">
                    {l.priceBling != null ? `${l.priceBling.toLocaleString()} BLiNG!` : ''}
                    {l.quantity > 1 ? ` · qty ${l.quantity}` : ''}
                  </span>
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider',
                    active ? '' : 'bg-zinc-100 text-zinc-500',
                  )}
                  style={
                    active ? { background: `${BAZAAR_ACCENT}18`, color: BAZAAR_ACCENT } : undefined
                  }
                  data-size="meta"
                >
                  {l.status}
                </span>
                {active &&
                  (armed === l.id ? (
                    <span className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void withdraw(l.id)}
                        disabled={busy}
                        className="rounded-full bg-red-600 px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setArmed(null)}
                        className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setArmed(l.id)}
                      className="flex-shrink-0 rounded-full border border-red-200 px-2 py-0.5 text-[10.5px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                      title="Withdraw this OFFER (blocked while orders are open)"
                    >
                      Withdraw
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
