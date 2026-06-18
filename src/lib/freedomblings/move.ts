import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
/* ============================================================================
   FreedomBLiNGS — move value (Slice: Give · Get · Offer).
   ----------------------------------------------------------------------------
   The first WRITE surface and the first RPC call. GIVE wraps the prod RPC
   bling_send (SECURITY DEFINER, auth-pinned: caller auth.uid() must equal
   p_sender_id). We do NOT modify the contract — we read it:

     bling_send(p_sender_id uuid, p_recipient_id uuid, p_amount numeric,
                p_category text = null, p_memo text = null) → jsonb
     → {ok, debit_tx_id, credit_tx_id, sender_balance_after,
        recipient_balance_after}

   FEE-FREE: the whole amount moves (double-entry → two bling_transactions rows,
   send_debit/send_credit). Minimum 0.1 BLiNG!. Self-send rejected.

   STRING DISCIPLINE (Sacred-Sum rule, same as ledger.ts): p_amount is passed as
   a STRING — never Number()'d. PostgREST casts the JSON string straight to the
   numeric(24,6) argument, so precision past 2^53 survives the wire intact.
   ============================================================================ */
import { notifyLedgerChanged } from './ledger';

/* ---- recipient resolution ------------------------------------------------- */
export interface Recipient {
  id: string;
  handle: string;
  display: string;
}

/** Look up a Bee by handle (bees has public SELECT under RLS). Reads ONLY
    id/handle/name. Tolerates a leading @ and case; handles are lowercase. */
export async function resolveRecipient(handleRaw: string): Promise<Recipient | null> {
  if (!supabase) return null;
  const handle = handleRaw.trim().replace(/^@/, '').toLowerCase();
  if (!handle) return null;
  const { data, error } = await supabase
    .from('bees')
    .select('id, handle, name')
    .eq('handle', handle)
    .maybeSingle();
  if (error || !data) return null;
  // biome-ignore lint/suspicious/noExplicitAny: untyped DB row → narrowed here
  const r = data as any;
  const name = (r.name as string | null)?.trim();
  return {
    id: String(r.id),
    handle: String(r.handle),
    display: name || `@${r.handle}`,
  };
}

/* ---- GIVE (bling_send) ---------------------------------------------------- */
export type GiveStatus = 'idle' | 'sending' | 'done' | 'error';

export interface GiveOk {
  debitTxId: string | null;
  creditTxId: string | null;
  senderBalanceAfter: string | null; // raw numeric string — string discipline
}

export interface GiveState {
  status: GiveStatus;
  error: string | null;
  result: GiveOk | null;
}

/** Translate the RPC's raw error text into firewall-safe, member-facing copy.
    The contract surfaces: 'insufficient balance', 'recipient bee not found',
    'minimum SEND is 0.1 BLiNG!', 'cannot SEND to self'. */
function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('insufficient')) return "You don't have enough BLiNG! for that GIVE.";
  if (m.includes('recipient') && m.includes('not found'))
    return 'No member found with that handle.';
  if (m.includes('minimum')) return 'The minimum GIVE is 0.1 BLiNG!.';
  if (m.includes('self')) return "You can't GIVE to yourself.";
  return raw || 'That GIVE could not be completed. Try again in a moment.';
}

export interface GiveArgs {
  recipientId: string;
  amount: string; // decimal string — passed straight through, never Number()'d
  memo?: string;
}

export function useGive() {
  const { user } = useAuth();
  const [state, setState] = useState<GiveState>({ status: 'idle', error: null, result: null });

  async function give(args: GiveArgs): Promise<GiveOk | null> {
    if (!supabase || !user) {
      setState({ status: 'error', error: 'Sign in to GIVE.', result: null });
      return null;
    }
    setState({ status: 'sending', error: null, result: null });

    const { data, error } = await supabase.rpc('bling_send', {
      p_sender_id: user.id,
      p_recipient_id: args.recipientId,
      p_amount: args.amount, // STRING — preserve precision (numeric on the DB side)
      p_category: null,
      p_memo: args.memo?.trim() || null,
    });

    // Path 1: the RPC RAISEd (insufficient/self/min/not-found) → error.message.
    if (error) {
      setState({ status: 'error', error: friendlyError(error.message), result: null });
      return null;
    }
    // Path 2: the RPC returned jsonb. Honour {ok:false, error}.
    // biome-ignore lint/suspicious/noExplicitAny: jsonb payload → narrowed here
    const r = (data ?? {}) as any;
    if (!r.ok) {
      setState({ status: 'error', error: friendlyError(String(r.error ?? '')), result: null });
      return null;
    }

    const ok: GiveOk = {
      debitTxId: r.debit_tx_id != null ? String(r.debit_tx_id) : null,
      creditTxId: r.credit_tx_id != null ? String(r.credit_tx_id) : null,
      senderBalanceAfter: r.sender_balance_after != null ? String(r.sender_balance_after) : null,
    };
    // The balance + ledger read hooks have no FK to this write — ping them.
    notifyLedgerChanged();
    setState({ status: 'done', error: null, result: ok });
    return ok;
  }

  function reset(): void {
    setState({ status: 'idle', error: null, result: null });
  }

  return { ...state, give, reset };
}
