import { formatBling } from '@/lib/bazaar';
import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { fmtDate } from '../ui';

/** Bazaar order/sale status → white-shell badge. Mirrors BazaarOrders' map. */
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  paid: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Paid' },
  shipped: { bg: '#FEF3C7', color: '#B45309', label: 'Shipped' },
  fulfilled: { bg: '#DCFCE7', color: '#15803D', label: 'Fulfilled' },
  cancelled: { bg: '#F4F4F5', color: '#71717A', label: 'Cancelled' },
  refunded: { bg: '#FEE2E2', color: '#B91C1C', label: 'Refunded' },
};

export function OrderStatusBadge({ status }: { status: string }) {
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

/** Read-only order/sale row for the ACCOUNT hub. */
export function OrderRow({
  listingId,
  image,
  title,
  partyPrefix,
  partyLabel,
  blingPaid,
  status,
  createdAt,
}: {
  listingId: string;
  image: string | null;
  title: string;
  partyPrefix: string;
  partyLabel: string;
  blingPaid: number;
  status: string;
  createdAt: string;
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
          <span style={{ color: ACCOUNT_ACCENT }}>{formatBling(blingPaid)} BLiNG!</span>
          <span aria-hidden="true">·</span>
          <span>{fmtDate(createdAt)}</span>
        </div>
      </div>
      <OrderStatusBadge status={status} />
    </div>
  );
}
