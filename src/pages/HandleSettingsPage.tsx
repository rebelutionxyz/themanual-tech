import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, Hash, Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Premium handle claims — SINK 1 frontend.
// Closed loop: a Bee GIVES BLiNG! to claim a premium (1–4 char) handle; the
// BLiNG! returns to The Source pool (handled server-side by claim_premium_handle).
// Balance is read via the lockdown-safe my_bling_balance() RPC — never a direct
// bees select. This is the canonical pattern for all future sink UIs.
// Language firewall: GIVE / DONATE / Claim only — never buy/price/purchase.
// ---------------------------------------------------------------------------

type Tier = 'legendary' | 'rare' | 'premium';

interface PricingTier {
  tier_name: Tier;
  base_price_bling: number;
  description: string;
}

interface RecentClaim {
  handle: string;
  tier: string;
  reserved_at: string;
}

interface ClaimResult {
  ok: boolean;
  tier?: string;
  price?: number;
  error?: string;
}

const TIER_LABEL: Record<Tier, string> = {
  legendary: 'Legendary',
  rare: 'Rare',
  premium: 'Premium',
};

const TIER_COLOR: Record<Tier, string> = {
  legendary: 'text-honey',
  rare: 'text-text-silver-bright',
  premium: 'text-text-silver',
};

// Mirror of public.classify_handle_tier — keep in sync with the SQL.
function classifyTier(handle: string): Tier | null {
  const len = handle.length;
  if (len === 1) return 'legendary';
  if (len === 2) return 'rare';
  if (len >= 3 && len <= 4) return 'premium';
  return null;
}

// Same character class as the platform handle format, minus the length bound
// (premium handles run 1–4 chars; legendary is a single char).
function normalizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

const ERROR_COPY: Record<string, string> = {
  unauthenticated: 'Sign in to claim a handle.',
  handle_not_premium: 'Only 1–4 character handles are premium. Longer handles are free.',
  insufficient_bling: 'Not enough BLiNG! — EARN or RECEIVE more, then try again.',
  already_claimed: 'That handle was just claimed by another Bee.',
};

function fmtBling(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function HandleSettingsPage() {
  const { bee, loading: authLoading, configured } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [recent, setRecent] = useState<RecentClaim[]>([]);

  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState<boolean | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const handle = useMemo(() => normalizeHandle(query), [query]);
  const tier = useMemo(() => classifyTier(handle), [handle]);
  const tierAmount = useMemo(() => {
    if (!tier) return null;
    return tiers.find((t) => t.tier_name === tier)?.base_price_bling ?? null;
  }, [tier, tiers]);

  const refreshBalance = useCallback(async () => {
    if (!supabase || !bee) return;
    const { data } = await supabase.rpc('my_bling_balance');
    if (data !== null && data !== undefined) setBalance(Number(data));
  }, [bee]);

  const refreshRecent = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('handle_reservations')
      .select('handle, tier, reserved_at')
      .eq('is_active', true)
      .order('reserved_at', { ascending: false })
      .limit(10);
    if (data) setRecent(data as RecentClaim[]);
  }, []);

  // Initial load: balance + tiers + recent claims.
  useEffect(() => {
    if (!supabase || !bee) return;
    void refreshBalance();
    void refreshRecent();
    void (async () => {
      const { data } = await supabase
        .from('handle_pricing_tiers')
        .select('tier_name, base_price_bling, description');
      if (data) {
        setTiers(
          (data as { tier_name: Tier; base_price_bling: number; description: string }[]).map(
            (t) => ({ ...t, base_price_bling: Number(t.base_price_bling) }),
          ),
        );
      }
    })();
  }, [bee, refreshBalance, refreshRecent]);

  // Escape closes the confirm modal (backdrop has no click handler — a11y).
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !claiming) setConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, claiming]);

  // Availability check — debounced via a short timer on the normalized handle.
  useEffect(() => {
    if (!supabase || !tier) {
      setTaken(null);
      return;
    }
    const sb = supabase;
    let cancelled = false;
    setChecking(true);
    const timer = window.setTimeout(async () => {
      const { data } = await sb
        .from('handle_reservations')
        .select('handle')
        .eq('handle', handle)
        .eq('is_active', true)
        .maybeSingle();
      if (!cancelled) {
        setTaken(Boolean(data));
        setChecking(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setChecking(false);
    };
  }, [handle, tier]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-text-silver/40" />
      </div>
    );
  }
  if (!bee) return <Navigate to="/login" replace />;

  const canAfford = balance !== null && tierAmount !== null && balance >= tierAmount;
  const claimable = Boolean(tier) && taken === false && canAfford && !checking;

  async function doClaim() {
    if (!supabase || !tier) return;
    setClaiming(true);
    setFlash(null);
    const { data, error } = await supabase.rpc('claim_premium_handle', { p_handle: handle });
    setClaiming(false);
    setConfirmOpen(false);

    if (error) {
      setFlash({ kind: 'err', msg: error.message });
      return;
    }
    const res = data as ClaimResult;
    if (res?.ok) {
      setFlash({ kind: 'ok', msg: `@${handle} is yours — ${fmtBling(res.price ?? 0)} BLiNG! returned to The Source.` });
      setQuery('');
      setTaken(null);
      void refreshBalance();
      void refreshRecent();
    } else {
      setFlash({ kind: 'err', msg: ERROR_COPY[res?.error ?? ''] ?? 'Claim failed — try again.' });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-honey">
          <Hash size={18} />
          <h1 className="font-display text-3xl font-semibold text-text-silver-bright">
            Premium Handles
          </h1>
        </div>
        <p className="mt-2 max-w-xl text-text-dim" style={{ fontSize: '13px' }}>
          Short handles are scarce. GIVE BLiNG! to claim one — every BLiNG! you give
          returns to The Source, lifting the faucet for all Bees.
        </p>
      </div>

      {/* Identity + balance */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <p className="font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Current handle
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-text-silver-bright">
            @{bee.handle}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <p className="font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Your BLiNG!
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-honey">
            {balance === null ? '—' : fmtBling(balance)}
          </p>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div
          className={cn(
            'mb-6 flex items-start gap-2 rounded-md border p-3',
            flash.kind === 'ok'
              ? 'border-honey/40 bg-honey/10 text-honey'
              : 'border-kettle-contested/40 bg-kettle-contested/10 text-kettle-contested',
          )}
          style={{ fontSize: '12.5px' }}
        >
          {flash.kind === 'ok' ? <Check size={15} /> : <X size={15} />}
          <span>{flash.msg}</span>
        </div>
      )}

      {/* Search / claim */}
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-6">
        <label
          htmlFor="handle-search"
          className="font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Find a handle
        </label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-md border border-border bg-bg px-3 focus-within:border-border-bright">
            <span className="font-display text-lg text-text-dim">@</span>
            <input
              id="handle-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFlash(null);
              }}
              maxLength={4}
              autoComplete="off"
              spellCheck={false}
              placeholder="cat"
              className="w-full bg-transparent px-1.5 py-2.5 font-display text-lg text-text-silver-bright outline-none placeholder:text-text-dim/50"
            />
          </div>
          <button
            type="button"
            disabled={!claimable}
            onClick={() => setConfirmOpen(true)}
            className={cn(
              'rounded-md px-5 py-2.5 font-mono text-sm transition-colors',
              claimable
                ? 'bg-honey text-bg hover:bg-honey/90'
                : 'cursor-not-allowed border border-border bg-bg-elevated text-text-dim',
            )}
          >
            Claim
          </button>
        </div>

        {/* Status line */}
        <div className="mt-3 min-h-[20px] font-mono" style={{ fontSize: '12px' }}>
          {!handle && <span className="text-text-dim">Enter a 1–4 character handle.</span>}
          {handle && !tier && (
            <span className="text-text-dim">
              @{handle} is 5+ characters — that's a free, standard handle.
            </span>
          )}
          {handle && tier && checking && <span className="text-text-muted">Checking @{handle}…</span>}
          {handle && tier && !checking && taken === true && (
            <span className="text-kettle-contested">@{handle} is already claimed.</span>
          )}
          {handle && tier && !checking && taken === false && (
            <span className={cn('inline-flex items-center gap-2', TIER_COLOR[tier])}>
              <Sparkles size={12} />
              @{handle} is available · {TIER_LABEL[tier]} · DONATE{' '}
              {tierAmount === null ? '…' : fmtBling(tierAmount)} BLiNG!
              {taken === false && !canAfford && balance !== null && (
                <span className="text-kettle-contested"> · not enough BLiNG!</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="mt-8">
        <h2 className="font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          Tiers
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['legendary', 'rare', 'premium'] as Tier[]).map((t) => {
            const row = tiers.find((x) => x.tier_name === t);
            return (
              <div key={t} className="rounded-lg border border-border bg-bg-elevated/40 p-4">
                <p className={cn('font-display text-lg font-semibold', TIER_COLOR[t])}>
                  {TIER_LABEL[t]}
                </p>
                <p className="mt-1 font-mono text-honey" style={{ fontSize: '13px' }}>
                  {row ? fmtBling(row.base_price_bling) : '—'} BLiNG!
                </p>
                <p className="mt-2 text-text-dim" style={{ fontSize: '11.5px' }}>
                  {row?.description ?? ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent claims — social proof */}
      <div className="mt-8">
        <h2 className="font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          Recently claimed
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-text-dim" style={{ fontSize: '12px' }}>
            No premium handles claimed yet — be the first.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-bg-elevated/40">
            {recent.map((c) => (
              <li key={c.handle} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-display text-text-silver-bright">@{c.handle}</span>
                <span
                  className={cn('font-mono uppercase tracking-wider', TIER_COLOR[(c.tier as Tier)] ?? 'text-text-dim')}
                  style={{ fontSize: '10.5px' }}
                  data-size="meta"
                >
                  {c.tier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!configured && (
        <div className="mt-6 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
          <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
            Read-only mode: Supabase not configured.
          </p>
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && tier && tierAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border-bright bg-bg-elevated p-6">
            <h3 className="font-display text-xl font-semibold text-text-silver-bright">
              Claim @{handle}?
            </h3>
            <p className="mt-3 text-text-dim" style={{ fontSize: '13px' }}>
              This GIVES <span className="font-mono text-honey">{fmtBling(tierAmount)} BLiNG!</span>{' '}
              from your balance to The Source pool, and reserves the{' '}
              <span className={TIER_COLOR[tier]}>{TIER_LABEL[tier]}</span> handle{' '}
              <span className="text-text-silver-bright">@{handle}</span> to you.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={claiming}
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-border px-4 py-2 font-mono text-sm text-text-dim hover:border-border-bright hover:text-text-silver"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={claiming}
                onClick={() => void doClaim()}
                className="inline-flex items-center gap-2 rounded-md bg-honey px-4 py-2 font-mono text-sm text-bg hover:bg-honey/90 disabled:opacity-60"
              >
                {claiming && <Loader2 size={14} className="animate-spin" />}
                {claiming ? 'Claiming…' : `GIVE ${fmtBling(tierAmount)} BLiNG!`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
