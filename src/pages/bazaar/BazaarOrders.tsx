import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, Loader2, Package } from 'lucide-react';
import {
  type BazaarOrder,
  type BazaarSale,
  bazaarConfirmReceived,
  bazaarMarkShipped,
  bazaarMyOrders,
  bazaarMySales,
  formatBling,
} from '@/lib/bazaar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BAZAAR_ACCENT } from '@/components/bazaar/cards';

export function BazaarOrders() {
  const { bee } = useAuth();
  const [tab, setTab] = useState<'orders' | 'sales'>('orders');

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
          <h1 className="font-display text-3xl font-semibold tracking-wide" style={{ color: BAZAAR_ACCENT }}>
            Orders
          </h1>
          <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }}>
            What you GOT &amp; what you OFFERED
          </p>
        </div>
      </div>

      {!bee ? (
        <p className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600" style={{ fontSize: '13px' }}>
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
          </div>
          <div className="mt-4">{tab === 'orders' ? <OrdersTab /> : <SalesTab />}</div>
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
      style={active ? { borderColor: BAZAAR_ACCENT, color: BAZAAR_ACCENT, fontSize: '14px' } : { fontSize: '14px' }}
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
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-zinc-500" style={{ fontSize: '11px' }} data-size="meta">
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
