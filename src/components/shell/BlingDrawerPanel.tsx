/* BlingDrawerPanel — what the BLiNG! header slot opens, on every astra.
 *
 * Owner ruling 2026-09-03: "Bling is not h24 tokens. they are totally
 * different things. the bling right sidebar would include transfer escrows,
 * and latest transactions. Just shortcuts to main info."
 *
 * So this is SHELL-LEVEL, not h24's: BLiNG! is the constellation currency and
 * the drawer behind its header slot is the same on every astra. Balance, open
 * escrows, the last few ledger rows, and one door to the full wallet. It reads
 * directly — both tables carry owner-scoped RLS (bling_tx_owner_read,
 * bling_escrows_party_read), so a Bee sees exactly their own rows and nothing
 * else — and the balance comes through my_bling_balance(). Floor-safe: every
 * section renders its own honest empty state; nothing here invents a row.
 *
 * Language firewall (CURRENCY canon): FREE / GIVE / SEND — never buy, mint,
 * price. Doors: "Transfer" (move composer) and "Open BLiNG!" (the house).
 */

import { supabase } from '@/lib/supabase';
import { ArrowRight, Droplet, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EscrowRow {
  id: string;
  amount: string | number;
  kind: string;
  status: string;
  created_at: string;
  timelock_release_at: string | null;
}
interface TxRow {
  id: string;
  type: string;
  amount: string | number;
  category: string | null;
  memo: string | null;
  created_at: string;
}

const fmt = (n: string | number | null) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

export function BlingDrawerPanel({
  balance,
  signedIn,
  onOpenLedger,
  onTransfer,
}: {
  balance: number | null;
  signedIn: boolean;
  /** Door to the full wallet page — the one "exit" this quick panel owns. */
  onOpenLedger: () => void;
  /** Owner 2026-09-03: "transfer could be an option in the right bling sidebar." */
  onTransfer?: () => void;
}) {
  const [escrows, setEscrows] = useState<EscrowRow[] | null>(null);
  const [txs, setTxs] = useState<TxRow[] | null>(null);

  useEffect(() => {
    if (!supabase || !signedIn) {
      setEscrows([]);
      setTxs([]);
      return;
    }
    const client = supabase;
    let live = true;
    (async () => {
      const [e, t] = await Promise.all([
        client
          .from('bling_escrows')
          .select('id, amount, kind, status, created_at, timelock_release_at')
          .in('status', ['open', 'pending', 'held', 'locked'])
          .order('created_at', { ascending: false })
          .limit(5),
        client
          .from('bling_transactions')
          .select('id, type, amount, category, memo, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);
      if (!live) return;
      setEscrows((e.data as EscrowRow[] | null) ?? []);
      setTxs((t.data as TxRow[] | null) ?? []);
    })();
    return () => {
      live = false;
    };
  }, [signedIn]);

  const section = (title: string, hint: string) => (
    <div className="flex items-baseline justify-between">
      <span
        className="font-mono uppercase tracking-wider"
        style={{ color: 'var(--mute)', fontSize: 10 }}
      >
        {title}
      </span>
      <span style={{ color: 'var(--mute)', fontSize: 10.5 }}>{hint}</span>
    </div>
  );
  const empty = (text: string) => (
    <p
      className="rounded-md px-3 py-2"
      style={{ border: '1px dashed var(--line)', color: 'var(--mute)', fontSize: 12 }}
    >
      {text}
    </p>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* balance */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono font-semibold tabular-nums"
            style={{ color: 'var(--bling-gold)', fontSize: 24 }}
          >
            {signedIn ? fmt(balance) : '—'}
          </span>
          <Droplet size={16} fill="var(--bling-gold)" stroke="var(--bling-gold)" />
        </div>
        <div style={{ color: 'var(--mute)', fontSize: 11 }}>
          {signedIn ? 'BLiNG! — spendable' : 'Sign in to see your BLiNG!'}
        </div>
      </div>

      {/* escrows */}
      <div className="flex flex-col gap-1.5">
        {section('Escrows', escrows ? `${escrows.length} open` : '…')}
        {escrows === null
          ? null
          : escrows.length === 0
            ? empty('No BLiNG! held in escrow.')
            : escrows.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
                  style={{ background: 'var(--input)', fontSize: 12 }}
                >
                  <Lock size={13} style={{ color: 'var(--mute)' }} />
                  <span className="flex-1 truncate" style={{ color: 'var(--body)' }}>
                    {e.kind.replace(/_/g, ' ')}
                    <span style={{ color: 'var(--mute)' }}> · {e.status}</span>
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{ color: 'var(--bling-gold)' }}
                  >
                    {fmt(e.amount)}
                  </span>
                </div>
              ))}
      </div>

      {/* latest transactions */}
      <div className="flex flex-col gap-1.5">
        {section('Latest', txs ? `${txs.length} rows` : '…')}
        {txs === null
          ? null
          : txs.length === 0
            ? empty('No BLiNG! movement yet.')
            : txs.map((t) => {
                const n = Number(t.amount);
                const neg = n < 0;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-1 py-1"
                    style={{ borderBottom: '1px solid var(--hairline)', fontSize: 12 }}
                  >
                    <span className="w-[86px] flex-none font-mono" style={{ color: 'var(--mute)', fontSize: 11 }}>
                      {when(t.created_at)}
                    </span>
                    <span className="flex-1 truncate" style={{ color: 'var(--body)' }}>
                      {(t.category ?? t.type).replace(/_/g, ' ')}
                      {t.memo ? <span style={{ color: 'var(--mute)' }}> · {t.memo}</span> : null}
                    </span>
                    <span
                      className="font-mono tabular-nums"
                      style={{ color: neg ? 'var(--body)' : 'var(--bling-gold)' }}
                    >
                      {neg ? '' : '+'}
                      {fmt(n)}
                    </span>
                  </div>
                );
              })}
      </div>

      {/* the doors — Transfer (move-value composer) + the BLiNG! house itself.
          Owner 2026-09-03: "open the ledger should just open bling". */}
      <div className="flex flex-col gap-1.5">
        {onTransfer && signedIn && <DrawerDoor label="Transfer" onClick={onTransfer} />}
        <DrawerDoor label="Open BLiNG!" onClick={onOpenLedger} />
      </div>
    </div>
  );
}

function DrawerDoor({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-md px-3 py-2 transition-colors"
      style={{ border: '1px solid var(--line)', color: 'var(--body)', fontSize: 12.5 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--bling-gold)';
        e.currentTarget.style.color = 'var(--ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--body)';
      }}
    >
      {label}
      <ArrowRight size={14} />
    </button>
  );
}
