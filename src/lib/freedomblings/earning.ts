import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — Earning / faucets (Slice #4) · LIVE, read-only.
   ----------------------------------------------------------------------------
   How BLiNG! is FREE'd to a Bee. Two faucets:
     · DROPS — what you DO (productive action → the actor)
     · DRIPS — what others VALUED (your creations, curated/engaged → the creator)

   REAL BLiNG! everywhere — the events show actual FREE'd currency, not ledger
   share-points. distribute_drops / distribute_drips write one bling_transactions
   row per distributed ledger row:
     · amount   = the real BLiNG! freed
     · category = 'drops_<action>'      (drops)  /  'drips_creator' | 'drips_royalty' | … (drips)
     · memo     = 'Drops <date> #<ledger_id>'
   So the recognition hero + recent-FREE rows read bling_transactions
   (type IN ('drops','drips'), owner-read — same table the Balance hook uses) and
   render the tx amount. Pending ledger accruals (status='pending') have no tx
   yet → they are NOT FREE'd, so they don't appear here (never a pending row with
   a BLiNG! figure). weighted_share is no longer shown as currency anywhere; the
   static rule weights still drive the public "How you earn" tables.

   The "how you earn" content is the LIVE public weight tables
   (drops_action_weight / drips_signal_weight, both USING(true)). free_active
   flags whether the Source is open — we do NOT surface freedom_price /
   freeing_multiplier (internal). The Bee's rank_multiplier (same ×N Standing
   shows) scales every drop/drip; DRIPS additionally carry a legitimacy_factor.

   STRING DISCIPLINE: every economy numeric crosses the wire as ::text and is
   summed/compared in BigInt micro-units (fmtBling for display) — never Number()'d.
   Small bounded scalars (weights, multipliers) are Number()'d for formatting only.
   Genesis truth: nothing FREE'd yet → empty, rendered honestly.
   ============================================================================ */
import { useEffect, useState } from 'react';
import { fmtBling, toMicros, useLedgerVersion } from './ledger';

/* ---- small bounded-scalar formatting (display only) ---------------------- */
function fmtScalar(raw: string | number | null | undefined): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return '0';
  return String(Number(n.toFixed(2)));
}

/* ---- shapes -------------------------------------------------------------- */
export interface FaucetSummary {
  key: 'Drops' | 'Drips';
  freed: string; // fmtBling of Σ bling_transactions for this faucet
  desc: string;
}

export interface EarnAction {
  action: string;
  weight: string; // the static rule weight (NOT BLiNG!)
  note: string;
  rankGated: boolean;
  isFloor: boolean; // floored actions carry per-Bee daily caps
}

export interface EarnSignal {
  signal: string;
  weight: string; // the static rule weight (NOT BLiNG!)
  note: string;
  dedupScope: string;
}

export interface RecentFree {
  id: string;
  kind: 'drop' | 'drip';
  label: string; // action key (drops) / role (drips)
  why: string; // human reason
  amt: string; // REAL BLiNG! freed (tx amount), formatted
  when: string; // 'D MMM'
  createdAt: string;
}

export interface EarningState {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  sourceOpen: boolean;
  multiplier: string | null; // the Bee's ×N rank multiplier
  drops: FaucetSummary;
  drips: FaucetSummary;
  actions: EarnAction[];
  signals: EarnSignal[];
  recent: RecentFree[];
  top: RecentFree | null; // most-recent FREE → recognition hero
}

const ZERO = '0';
const DROPS_DESC = 'For productive action — what you do.';
const DRIPS_DESC = 'For what others valued — your creations, curated and engaged.';

const EMPTY: EarningState = {
  status: 'loading',
  sourceOpen: true,
  multiplier: null,
  drops: { key: 'Drops', freed: ZERO, desc: DROPS_DESC },
  drips: { key: 'Drips', freed: ZERO, desc: DRIPS_DESC },
  actions: [],
  signals: [],
  recent: [],
  top: null,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The human "why" for a FREE, from its tx category. */
function whyFor(type: string, category: string, actionNote: Map<string, string>): string {
  const cat = category || '';
  if (type === 'drops') {
    const action = cat.replace(/^drops_/, '');
    return actionNote.get(action) ?? 'for productive action';
  }
  // drips category is ROLE-based — don't fabricate a signal, label by role.
  if (cat === 'drips_royalty') return 'as a Drip royalty on your work';
  if (cat === 'drips_creator') return 'for a creation others valued';
  return 'for what others valued';
}

export function useEarning(): EarningState {
  const { user, loading: authLoading } = useAuth();
  const version = useLedgerVersion();
  const [state, setState] = useState<EarningState>(EMPTY);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is a deliberate refetch trigger — bumped by notifyLedgerChanged(); not read in the body.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const [txRes, actRes, sigRes, sysRes, beeRes, ladderRes] = await Promise.all([
        // The FREE'd events themselves — real BLiNG! (tx amount), owner-read.
        client
          .from('bling_transactions')
          .select('id, type, amount::text, category, memo, created_at')
          .eq('bee_id', user!.id)
          .in('type', ['drops', 'drips'])
          .order('created_at', { ascending: false }),
        client
          .from('drops_action_weight')
          // no daily_cap column — daily caps derive from is_floor
          .select('action, weight::text, note, rank_gated, is_floor'),
        client.from('drips_signal_weight').select('signal, weight::text, note, dedup_scope'),
        client.from('bling_system_state').select('free_active').eq('id', 1).maybeSingle(),
        client.from('bees').select('bling_rank').eq('id', user!.id).maybeSingle(),
        client.from('rank_multiplier').select('rank_level, multiplier::text'),
      ]);
      if (!alive) return;

      // The FREE'd events are the heart of the surface; if they fail, unavailable.
      if (txRes.error) {
        setState({ ...EMPTY, status: 'unavailable' });
        return;
      }

      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const txs = (txRes.data ?? []) as any[];
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const actRows = (actRes.error ? [] : (actRes.data ?? [])) as any[];
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const sigRows = (sigRes.error ? [] : (sigRes.data ?? [])) as any[];

      // note lookup for the human "why" on drops
      const actionNote = new Map<string, string>(
        actRows.map((a) => [a.action, a.note ?? a.action]),
      );

      // BLiNG! actually FREE'd per faucet (BigInt micro-units, never Number()'d)
      let dropsMicros = 0n;
      let dripsMicros = 0n;
      for (const t of txs) {
        const m = toMicros(String(t.amount));
        const mag = m < 0n ? -m : m;
        if (t.type === 'drops') dropsMicros += mag;
        else if (t.type === 'drips') dripsMicros += mag;
      }

      // recent FREEs — straight off the tx rows (already newest-first), real BLiNG!
      const recent: RecentFree[] = txs.map((t) => {
        const isDrop = t.type === 'drops';
        const cat = String(t.category ?? '');
        const m = toMicros(String(t.amount));
        const mag = m < 0n ? -m : m;
        return {
          id: String(t.id),
          kind: isDrop ? ('drop' as const) : ('drip' as const),
          label: (isDrop ? cat.replace(/^drops_/, '') : cat.replace(/^drips_/, '')) || t.type,
          why: whyFor(t.type, cat, actionNote),
          amt: fmtBling(mag),
          when: whenLabel(t.created_at),
          createdAt: String(t.created_at),
        };
      });

      // how-you-earn tables (live, sorted by weight desc) — static rule weights
      const actions: EarnAction[] = actRows
        .map((a) => ({
          action: String(a.action),
          weight: fmtScalar(a.weight),
          note: String(a.note ?? ''),
          rankGated: Boolean(a.rank_gated),
          isFloor: Boolean(a.is_floor),
        }))
        .sort((a, b) => Number(b.weight) - Number(a.weight));
      const signals: EarnSignal[] = sigRows
        .map((s) => ({
          signal: String(s.signal),
          weight: fmtScalar(s.weight),
          note: String(s.note ?? ''),
          dedupScope: String(s.dedup_scope ?? ''),
        }))
        .sort((a, b) => Number(b.weight) - Number(a.weight));

      // the Bee's ×N rank multiplier (same as Standing): ladder row at bling_rank
      let multiplier: string | null = null;
      if (!beeRes.error && beeRes.data && !ladderRes.error && Array.isArray(ladderRes.data)) {
        // biome-ignore lint/suspicious/noExplicitAny: untyped DB row
        const rank = Number((beeRes.data as any).bling_rank ?? 1) || 1;
        // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows
        const hit = (ladderRes.data as any[]).find((r) => Number(r.rank_level) === rank);
        if (hit) multiplier = fmtScalar(hit.multiplier);
      }

      const sourceOpen = sysRes.error || !sysRes.data ? true : Boolean(sysRes.data.free_active);

      setState({
        status: 'live',
        sourceOpen,
        multiplier,
        drops: { key: 'Drops', freed: fmtBling(dropsMicros), desc: DROPS_DESC },
        drips: { key: 'Drips', freed: fmtBling(dripsMicros), desc: DRIPS_DESC },
        actions,
        signals,
        recent,
        top: recent[0] ?? null,
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user, version]);

  return state;
}
