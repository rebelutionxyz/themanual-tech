import { SendModule } from '@/components/freedomblings/SendModule';
import { HoneyDrop } from '@/components/ui/HoneyDrop';
import { useAuth } from '@/lib/auth';
import {
  type TxnRow,
  getCirculatingSupply,
  listMyTransactions,
  useFreedomblingsBalance,
} from '@/lib/freedomblings/ledger';
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react';

/* FreedomBLiNGS popup (pass 17/18 redesign). Dark-brown surface; standing/promise
   chrome stripped. Hero balance (BLiNG! after the number) · FREEd/GOT/GAVE tiles ·
   SEND · circulating supply · infinite-scroll transactions with sign coloring. */

const BG = '#26170E'; // espresso
const PANEL = '#342216';
const BORDER = '#4a331e';
const CREAM = '#F3E7D8';
const MUTED = '#C2A98F';
const GOLD = '#FAD15E';
const GREEN = '#6BCB91';
const RED = '#E58A7B';

const PAGE = 25;

export function BlingPopupContent() {
  const fb = useFreedomblingsBalance();
  const { bee } = useAuth();
  const [supply, setSupply] = useState<string | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    getCirculatingSupply()
      .then(setSupply)
      .catch(() => setSupply(null));
  }, []);

  // Initial transaction page (resets per Bee).
  useEffect(() => {
    if (!bee?.id) {
      setTxns([]);
      offsetRef.current = 0;
      setDone(false);
      return;
    }
    let cancelled = false;
    setTxns([]);
    offsetRef.current = 0;
    setDone(false);
    listMyTransactions(bee.id, PAGE, 0)
      .then((rows) => {
        if (cancelled) return;
        offsetRef.current = rows.length;
        setTxns(rows);
        if (rows.length < PAGE) setDone(true);
      })
      .catch(() => !cancelled && setDone(true));
    return () => {
      cancelled = true;
    };
  }, [bee?.id]);

  const loadMore = useCallback(async () => {
    if (!bee?.id || loadingMore || done) return;
    setLoadingMore(true);
    try {
      const rows = await listMyTransactions(bee.id, PAGE, offsetRef.current);
      offsetRef.current += rows.length;
      setTxns((prev) => [...prev, ...rows]);
      if (rows.length < PAGE) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoadingMore(false);
    }
  }, [bee?.id, loadingMore, done]);

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) void loadMore();
  }

  if (fb.status === 'signed-out' || !bee) {
    return (
      <div className="p-8 text-center" style={{ background: BG, color: CREAM }}>
        <h2 className="mb-2 font-display text-lg">Sign in to open your ledger</h2>
        <a
          href="/login"
          className="mt-2 inline-block rounded-full px-4 py-1.5 text-[13px] font-semibold"
          style={{ background: GOLD, color: '#3a2a10' }}
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div
      onScroll={onScroll}
      className="max-h-[88vh] overflow-y-auto rounded-2xl p-5"
      style={{ background: BG, color: CREAM }}
    >
      {/* Hero balance — BLiNG! AFTER the number, baseline-aligned. */}
      <div className="flex items-baseline gap-2">
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: '34px', color: CREAM }}
        >
          {fb.status === 'loading' ? '—' : fb.balance}
        </span>
        <span className="font-semibold" style={{ fontSize: '15px', color: GOLD }}>
          BLiNG!
        </span>
      </div>

      {/* FREEd / GOT / GAVE — one row, honey drop before each amount, no trailing unit. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Tile label="FREEd" amount={fb.freed} />
        <Tile label="GOT" amount={fb.got} />
        <Tile label="GAVE" amount={fb.gave} />
      </div>

      {/* SEND */}
      <div className="mt-4">
        <SendModule />
      </div>

      {/* Circulating supply — above Recent Movement. */}
      <div
        className="mt-4 flex items-center justify-between rounded-lg px-3 py-2"
        style={{ background: PANEL, border: `1px solid ${BORDER}` }}
      >
        <span className="font-mono text-[10.5px] uppercase tracking-wider" style={{ color: MUTED }}>
          Circulating supply
        </span>
        <span className="flex items-center gap-1 text-[14px] font-semibold" style={{ color: GOLD }}>
          <HoneyDrop size={13} />
          {supply ?? '…'}
        </span>
      </div>

      {/* Recent movement — infinite scroll, sign-colored. */}
      <div className="mt-4">
        <div
          className="mb-2 font-mono text-[10.5px] uppercase tracking-wider"
          style={{ color: MUTED }}
        >
          Recent movement
        </div>
        <div className="space-y-1">
          {txns.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5"
              style={{ background: PANEL }}
            >
              <div className="min-w-0">
                <div className="truncate text-[12.5px]" style={{ color: CREAM }}>
                  {t.memo || t.label}
                </div>
                <div className="text-[10.5px]" style={{ color: MUTED }}>
                  {t.when}
                </div>
              </div>
              <span
                className="flex flex-shrink-0 items-center gap-0.5 text-[13px] font-semibold tabular-nums"
                style={{ color: t.positive ? GREEN : RED }}
              >
                {t.positive ? '+' : '−'}
                <HoneyDrop size={11} />
                {t.amount}
              </span>
            </div>
          ))}
          {loadingMore && (
            <div className="py-2 text-center text-[11px]" style={{ color: MUTED }}>
              Loading…
            </div>
          )}
          {done && txns.length === 0 && (
            <div className="py-3 text-center text-[12px]" style={{ color: MUTED }}>
              No movement yet — your ledger begins the moment you first FREE.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: PANEL }}>
      <div className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <HoneyDrop size={12} />
        <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: CREAM }}>
          {amount}
        </span>
      </div>
    </div>
  );
}
