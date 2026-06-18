import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — Escrow (Slice #7) · LIVE party-data, read + actions.
   ----------------------------------------------------------------------------
   The OFFER-assurance layer of Give·Get·Offer. Reads bling_escrows, which is
   RLS party-scoped — USING (auth.uid() = creator_id OR recipient_id) — so the
   Bee sees only escrows they are a party to. Marketplace browse/list/create is
   Entertheprize (a separate Astra), NOT here.

   HELD amounts live in the escrow ROWS (conservation tracks them as
   'pooled_escrows'); creating an escrow drops the creator's balance and the
   amount rests in the row — bees.bling_held stays 0 and is NEVER read here. Each
   card's amount comes from its own row; any "total held" sums the viewer's held
   rows.

   kind   ∈ {p2p, order_match, crowdfund, campaign, timelock}
   status ∈ {held, released, cancelled, disputed, expired}
   timelock_release_at is non-NULL ONLY for kind='timelock' — never show a fake
   auto-release on other kinds.

   Actions (auth.uid()-pinned RPCs, p_escrow_id is BIGINT):
     bling_escrow_release / bling_escrow_cancel / bling_escrow_dispute
   notifyLedgerChanged() on success → every mounted hook refetches.

   STRING DISCIPLINE: amount is numeric(24,6), crosses the wire as ::text and is
   summed in BigInt micro-units (fmtBling for display) — never Number()'d.
   Genesis truth: 0 rows → empty, no fabricated escrow.
   ============================================================================ */
import { useEffect, useState } from 'react';
import { fmtBling, notifyLedgerChanged, toMicros, useLedgerVersion } from './ledger';

export type EscrowStatus = 'held' | 'released' | 'cancelled' | 'disputed' | 'expired';

export interface EscrowCard {
  id: number; // bigint PK
  status: string; // real status (held/released/cancelled/disputed/expired)
  kind: string; // p2p / order_match / crowdfund / campaign / timelock
  amount: string; // fmtBling of the row's amount
  viewerRole: 'creator' | 'recipient';
  creatorLabel: string; // 'you' | @handle | 'a member'
  recipientLabel: string; // 'you' | @handle | 'a member'
  counterpartyLabel: string; // the OTHER party, from the viewer's seat
  memo: string | null;
  timelockReleaseAt: string | null; // only meaningful when kind='timelock'
  createdAt: string;
  canRelease: boolean; // creator, status held
  canDispute: boolean; // either party, status held
}

export interface EscrowState {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  escrows: EscrowCard[];
  totalHeld: string; // Σ of the viewer's held rows, fmtBling
}

const EMPTY: EscrowState = { status: 'loading', escrows: [], totalHeld: '0' };

export interface EscrowActionResult {
  ok: boolean;
  error?: string;
}

export interface UseEscrow extends EscrowState {
  release: (id: number) => Promise<EscrowActionResult>;
  dispute: (id: number) => Promise<EscrowActionResult>;
}

function labelFor(id: string, me: string, handles: Map<string, string>): string {
  if (id === me) return 'you';
  return handles.get(id) ?? 'a member';
}

export function useEscrow(): UseEscrow {
  const { user, loading: authLoading } = useAuth();
  const version = useLedgerVersion();
  const [state, setState] = useState<EscrowState>(EMPTY);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is a deliberate refetch trigger — bumped by notifyLedgerChanged() after an action; not read in the body.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    const me = user.id;
    async function load() {
      const { data, error } = await client
        .from('bling_escrows')
        .select(
          'id, creator_id, recipient_id, amount::text, kind, status, timelock_release_at, memo, created_at, released_at, cancelled_at, disputed_at',
        )
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) {
        setState({ ...EMPTY, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
      const rows = (data ?? []) as any[];

      // Resolve the other party's handle (bees public-read); 'you' for self.
      const otherIds = new Set<string>();
      for (const r of rows) {
        if (String(r.creator_id) !== me) otherIds.add(String(r.creator_id));
        if (String(r.recipient_id) !== me) otherIds.add(String(r.recipient_id));
      }
      const handles = new Map<string, string>();
      if (otherIds.size > 0) {
        const { data: bees } = await client
          .from('bees')
          .select('id, handle, name')
          .in('id', Array.from(otherIds));
        if (!alive) return;
        // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
        for (const b of (bees ?? []) as any[]) {
          const display = (b.name as string | null)?.trim() || `@${b.handle}`;
          handles.set(String(b.id), display);
        }
      }

      let heldMicros = 0n;
      const escrows: EscrowCard[] = rows.map((r) => {
        const creatorId = String(r.creator_id);
        const recipientId = String(r.recipient_id);
        const viewerRole = creatorId === me ? 'creator' : 'recipient';
        const mag = (() => {
          const m = toMicros(String(r.amount));
          return m < 0n ? -m : m;
        })();
        if (r.status === 'held') heldMicros += mag;
        const creatorLabel = labelFor(creatorId, me, handles);
        const recipientLabel = labelFor(recipientId, me, handles);
        return {
          id: Number(r.id),
          status: String(r.status),
          kind: String(r.kind),
          amount: fmtBling(mag),
          viewerRole,
          creatorLabel,
          recipientLabel,
          counterpartyLabel: viewerRole === 'creator' ? recipientLabel : creatorLabel,
          memo: r.memo ?? null,
          timelockReleaseAt: r.kind === 'timelock' ? (r.timelock_release_at ?? null) : null,
          createdAt: String(r.created_at),
          canRelease: r.status === 'held' && viewerRole === 'creator',
          canDispute: r.status === 'held',
        };
      });

      setState({ status: 'live', escrows, totalHeld: fmtBling(heldMicros) });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user, version]);

  // ---- actions (auth.uid()-pinned RPCs; refetch on success) ----------------
  async function runAction(rpc: string, id: number): Promise<EscrowActionResult> {
    if (!supabase || !user) return { ok: false, error: 'Sign in to act on an escrow.' };
    const { data, error } = await supabase.rpc(rpc, { p_escrow_id: id, p_actor_id: user.id });
    if (error) return { ok: false, error: error.message };
    // RPCs may return a jsonb {ok:false,...}; honour it if present.
    // biome-ignore lint/suspicious/noExplicitAny: jsonb payload
    const r = (data ?? null) as any;
    if (r && typeof r === 'object' && 'ok' in r && !r.ok) {
      return { ok: false, error: String(r.error ?? 'That action could not be completed.') };
    }
    notifyLedgerChanged();
    return { ok: true };
  }

  return {
    ...state,
    release: (id: number) => runAction('bling_escrow_release', id),
    dispute: (id: number) => runAction('bling_escrow_dispute', id),
  };
}
