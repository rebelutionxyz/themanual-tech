-- =============================================================================
-- Migration 23 — Schema v9.0 Security
-- =============================================================================
-- Date:        2026-05-06
-- Author:      Code 4 (Claude Opus 4.7) — supervised by Butch
-- Status:      UNEXECUTED on production main. Apply to v9-security branch first.
-- Source:      shared/notes/audits/abuse-review-bling-rpcs-2026-05-06.md
--              shared/notes/migrations/schema-refactor-proposal-v9-2026-05-06.md
--
-- Findings addressed:
--   C1  RLS disabled on 7 canon-data tables (realms, atoms, atom_*, entity_*)
--   C2  RLS-enabled-no-policy on bling_stripe_events
--   C3  SECURITY DEFINER BLiNG! mutators callable by anon (13 functions)
--   C4  search_path mutable on 4 trigger/util functions
--   C7  bees.email UNIQUE not case-folded
--
-- Out of scope (deferred):
--   C5  pg_trgm in public schema (move to v9.1+)
--   C6  Leaked password protection (dashboard toggle, not SQL)
--
-- IMPORTANT — DO NOT execute against main without first applying to a Supabase
-- branch and running the verification block at the bottom. Several BLiNG! RPCs
-- have their bodies modified to add auth.uid() enforcement; if any frontend
-- code passes mismatched bee IDs, those calls will start failing post-migration.
-- Test in branch first.
-- =============================================================================

BEGIN;

-- =============================================================================
-- BLOCK A — Enable RLS on 7 canon-data tables (C1)
-- =============================================================================
-- Read-only public canon (atoms, realms, entity_*): SELECT for everyone, no
-- write policies (writes only via service-role seed scripts).
-- User-content canon (atom_comments, atom_sources, atom_kettle_votes):
-- public read, owner-only write.

-- ----- realms (read-only public) -----
ALTER TABLE public.realms ENABLE ROW LEVEL SECURITY;

CREATE POLICY realms_read_all
    ON public.realms FOR SELECT
    USING (true);

-- ----- atoms (read-only public) -----
ALTER TABLE public.atoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY atoms_read_all
    ON public.atoms FOR SELECT
    USING (true);

-- ----- entity_atom_links (read-only public) -----
ALTER TABLE public.entity_atom_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_atom_links_read_all
    ON public.entity_atom_links FOR SELECT
    USING (true);

-- ----- entity_category_links (read-only public) -----
ALTER TABLE public.entity_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_category_links_read_all
    ON public.entity_category_links FOR SELECT
    USING (true);

-- ----- atom_kettle_votes (public read; owner write) -----
ALTER TABLE public.atom_kettle_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY atom_kettle_votes_read_all
    ON public.atom_kettle_votes FOR SELECT
    USING (true);

CREATE POLICY atom_kettle_votes_owner_insert
    ON public.atom_kettle_votes FOR INSERT
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_kettle_votes_owner_update
    ON public.atom_kettle_votes FOR UPDATE
    USING (auth.uid() = bee_id)
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_kettle_votes_owner_delete
    ON public.atom_kettle_votes FOR DELETE
    USING (auth.uid() = bee_id);

-- ----- atom_sources (public read; owner write) -----
ALTER TABLE public.atom_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY atom_sources_read_all
    ON public.atom_sources FOR SELECT
    USING (true);

CREATE POLICY atom_sources_owner_insert
    ON public.atom_sources FOR INSERT
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_sources_owner_update
    ON public.atom_sources FOR UPDATE
    USING (auth.uid() = bee_id)
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_sources_owner_delete
    ON public.atom_sources FOR DELETE
    USING (auth.uid() = bee_id);

-- ----- atom_comments (public read; owner write) -----
ALTER TABLE public.atom_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY atom_comments_read_all
    ON public.atom_comments FOR SELECT
    USING (true);

CREATE POLICY atom_comments_owner_insert
    ON public.atom_comments FOR INSERT
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_comments_owner_update
    ON public.atom_comments FOR UPDATE
    USING (auth.uid() = bee_id)
    WITH CHECK (auth.uid() = bee_id);

CREATE POLICY atom_comments_owner_delete
    ON public.atom_comments FOR DELETE
    USING (auth.uid() = bee_id);


-- =============================================================================
-- BLOCK B — Add policies to bling_stripe_events (C2)
-- =============================================================================
-- RLS is already enabled (advisor: rls_enabled_no_policy). Add policies:
-- service-role only writes; bee can read own events.

CREATE POLICY bling_stripe_events_no_user_writes
    ON public.bling_stripe_events FOR INSERT
    WITH CHECK (false);

CREATE POLICY bling_stripe_events_owner_read
    ON public.bling_stripe_events FOR SELECT
    USING (auth.uid() = bee_id);


-- =============================================================================
-- BLOCK C — Function-body fixes + EXECUTE grants (C3)
-- =============================================================================
-- Strategy:
--   1) For 7 user-initiated CRITICAL functions: rewrite body to enforce
--      auth.uid() match against the actor parameter. REVOKE FROM PUBLIC,
--      GRANT TO authenticated.
--   2) For 2 service-role-only functions (bling_mint, bling_credit_purchase):
--      REVOKE FROM PUBLIC. No body change. service_role retains implicit access.
--   3) For 2 defense-in-depth functions (bump_canonical_fetch_count,
--      increment_thread_reply_count): rewrite body to require auth.uid() IS NOT
--      NULL. REVOKE FROM PUBLIC, GRANT TO authenticated.
--   4) For 2 trigger functions (handle_forum_post_insert, handle_new_bee):
--      REVOKE FROM PUBLIC for hygiene. Triggers continue to fire (postgres
--      runs trigger functions internally, regardless of the EXECUTE grant).

-- ----- C.1 bling_send: enforce sender = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_send(
    p_sender_id    uuid,
    p_recipient_id uuid,
    p_amount       numeric,
    p_category     text DEFAULT 'general',
    p_memo         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_sender_balance   numeric;
    v_sender_handle    text;
    v_recipient_handle text;
    v_fee_pct          numeric;
    v_fee              numeric := 0;
    v_total_debit      numeric;
    v_treasury_id      constant uuid := '00000000-0000-0000-0000-000000000bee'::uuid;
BEGIN
    -- v9.0 security guard: caller must be the sender
    IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
        RAISE EXCEPTION 'unauthorized: sender must match auth.uid()';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    IF p_sender_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot send to yourself';
    END IF;
    IF p_category NOT IN ('general','kindness','productivity','learning') THEN
        RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;

    IF p_category = 'general' THEN
        SELECT bee_to_bee_fee_pct INTO v_fee_pct FROM public.bling_system_state WHERE id = 1;
        v_fee := round(p_amount * v_fee_pct, 3);
    END IF;

    v_total_debit := p_amount + v_fee;

    SELECT bling_balance, handle INTO v_sender_balance, v_sender_handle
        FROM public.bees WHERE id = p_sender_id FOR UPDATE;
    IF v_sender_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found';
    END IF;
    IF v_sender_balance < v_total_debit THEN
        RAISE EXCEPTION 'Insufficient balance (need % including % fee)', v_total_debit, v_fee;
    END IF;

    SELECT handle INTO v_recipient_handle
        FROM public.bees WHERE id = p_recipient_id FOR UPDATE;
    IF v_recipient_handle IS NULL THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance - v_total_debit WHERE id = p_sender_id;
    UPDATE public.bees SET bling_balance = bling_balance + p_amount      WHERE id = p_recipient_id;

    INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
        VALUES
            (p_sender_id,    'sent',     p_category, p_amount, v_recipient_handle, p_memo),
            (p_recipient_id, 'received', p_category, p_amount, v_sender_handle,    p_memo);

    IF v_fee > 0 THEN
        PERFORM 1 FROM public.bees WHERE id = v_treasury_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Treasury bee not found (expected id %)', v_treasury_id;
        END IF;
        UPDATE public.bees SET bling_balance = bling_balance + v_fee WHERE id = v_treasury_id;

        INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
            VALUES
                (p_sender_id,  'fee',          p_category, v_fee, 'combtreasury',
                 format('%.1f%% bee-to-bee fee on send to @%s', v_fee_pct * 100, v_recipient_handle)),
                (v_treasury_id,'fee_received', p_category, v_fee, v_sender_handle,
                 format('Fee from @%s on send to @%s', v_sender_handle, v_recipient_handle));
    END IF;

    RETURN jsonb_build_object('success', true, 'fee', v_fee, 'category', p_category);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text) TO authenticated;


-- ----- C.2 bling_create_escrow: enforce creator = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_create_escrow(
    p_creator_id   uuid,
    p_recipient_id uuid,
    p_amount       numeric,
    p_kind         text DEFAULT 'manual',
    p_memo         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_balance   numeric;
    v_escrow_id bigint;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_creator_id THEN
        RAISE EXCEPTION 'unauthorized: creator must match auth.uid()';
    END IF;

    IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
    IF p_creator_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot escrow to yourself';
    END IF;

    SELECT bling_balance INTO v_balance FROM public.bees WHERE id = p_creator_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Creator not found'; END IF;
    IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    PERFORM 1 FROM public.bees WHERE id = p_recipient_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recipient not found'; END IF;

    UPDATE public.bees SET bling_balance = bling_balance - p_amount WHERE id = p_creator_id;

    INSERT INTO public.bling_escrows (creator_id, recipient_id, amount, kind, memo)
        VALUES (p_creator_id, p_recipient_id, p_amount, p_kind, p_memo)
        RETURNING id INTO v_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (p_creator_id, 'escrow_created', p_amount, v_escrow_id, p_memo);

    RETURN jsonb_build_object('success', true, 'escrow_id', v_escrow_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text) TO authenticated;


-- ----- C.3 bling_release_escrow: enforce actor = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_release_escrow(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
        RAISE EXCEPTION 'unauthorized: actor must match auth.uid()';
    END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF v_escrow.creator_id <> p_actor_id THEN
        RAISE EXCEPTION 'Only creator can release';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
        WHERE id = v_escrow.recipient_id;

    UPDATE public.bling_escrows
        SET status = 'released', resolved_at = now()
        WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (v_escrow.recipient_id, 'escrow_released',
                v_escrow.amount, p_escrow_id, v_escrow.memo);

    RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid) TO authenticated;


-- ----- C.4 bling_cancel_escrow: enforce actor = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_cancel_escrow(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
        RAISE EXCEPTION 'unauthorized: actor must match auth.uid()';
    END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF v_escrow.creator_id <> p_actor_id THEN
        RAISE EXCEPTION 'Only creator can cancel';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
        WHERE id = v_escrow.creator_id;
    UPDATE public.bling_escrows
        SET status = 'cancelled', resolved_at = now()
        WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (v_escrow.creator_id, 'escrow_cancelled',
                v_escrow.amount, p_escrow_id, 'Escrow cancelled · BLiNG! refunded');

    RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid) TO authenticated;


-- ----- C.5 bling_dispute_escrow: enforce actor = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_dispute_escrow(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
        RAISE EXCEPTION 'unauthorized: actor must match auth.uid()';
    END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF p_actor_id NOT IN (v_escrow.creator_id, v_escrow.recipient_id) THEN
        RAISE EXCEPTION 'Only escrow parties can dispute';
    END IF;

    UPDATE public.bling_escrows SET status = 'disputed' WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (p_actor_id, 'escrow_disputed', v_escrow.amount, p_escrow_id, 'Escrow disputed');

    RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid) TO authenticated;


-- ----- C.6 bling_place_order: enforce bee = auth.uid() -----
CREATE OR REPLACE FUNCTION public.bling_place_order(
    p_bee_id  uuid,
    p_side    text,
    p_price   numeric,
    p_amount  numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_balance numeric;
    v_id      bigint;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_bee_id THEN
        RAISE EXCEPTION 'unauthorized: bee must match auth.uid()';
    END IF;

    IF p_side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'Invalid side'; END IF;
    IF p_price <= 0 OR p_amount < 0.001 THEN RAISE EXCEPTION 'Bad price/amount'; END IF;

    SELECT bling_balance INTO v_balance FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Bee not found'; END IF;
    IF p_side = 'sell' AND v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance to place sell';
    END IF;
    IF p_side = 'buy' AND v_balance < (p_price * p_amount) THEN
        RAISE EXCEPTION 'Insufficient balance to place buy';
    END IF;

    INSERT INTO public.bling_orders (bee_id, side, price, amount)
        VALUES (p_bee_id, p_side, p_price, p_amount)
        RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'order_id', v_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric) TO authenticated;


-- ----- C.7 bling_fill_order: enforce taker = auth.uid() (with service-role bypass) -----
CREATE OR REPLACE FUNCTION public.bling_fill_order(
    p_taker_id uuid,
    p_order_id bigint,
    p_fill_amt numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_order         public.bling_orders%ROWTYPE;
    v_maker_handle  text;
    v_taker_handle  text;
    v_remaining     numeric;
    v_cost          numeric;
    v_sell_fee_pct  numeric;
    v_fee           numeric;
    v_net_to_seller numeric;
    v_caller_role   text;
BEGIN
    -- v9.0 security guard:
    -- Allow service-role callers (e.g. bling_credit_purchase chain via Stripe)
    -- to bypass auth.uid() check, since auth.uid() is NULL under service-role.
    -- For all other paths, require taker_id matches caller's auth.uid().
    v_caller_role := current_setting('request.jwt.claim.role', true);
    IF v_caller_role IS DISTINCT FROM 'service_role' THEN
        IF auth.uid() IS NULL OR auth.uid() <> p_taker_id THEN
            RAISE EXCEPTION 'unauthorized: taker must match auth.uid()';
        END IF;
    END IF;

    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'open' THEN
        RAISE EXCEPTION 'Order not open';
    END IF;

    v_remaining := v_order.amount - v_order.filled;
    IF p_fill_amt > v_remaining OR p_fill_amt < 0.001 THEN
        RAISE EXCEPTION 'Bad fill amount';
    END IF;

    SELECT handle INTO v_maker_handle FROM public.bees WHERE id = v_order.bee_id FOR UPDATE;
    SELECT handle INTO v_taker_handle FROM public.bees WHERE id = p_taker_id     FOR UPDATE;

    SELECT sell_fee_pct INTO v_sell_fee_pct FROM public.bling_system_state WHERE id = 1;

    v_cost          := p_fill_amt * v_order.price;
    v_fee           := v_cost * v_sell_fee_pct;
    v_net_to_seller := v_cost - v_fee;

    IF v_order.side = 'sell' THEN
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = p_taker_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = v_order.bee_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (p_taker_id,     'bought', p_fill_amt,      v_maker_handle, p_order_id),
                   (v_order.bee_id, 'sold',   v_net_to_seller, v_taker_handle, p_order_id);
    ELSE
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = v_order.bee_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = p_taker_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (v_order.bee_id, 'bought', p_fill_amt,      v_taker_handle, p_order_id),
                   (p_taker_id,     'sold',   v_net_to_seller, v_maker_handle, p_order_id);
    END IF;

    UPDATE public.bling_orders
        SET filled = filled + p_fill_amt,
            status = CASE WHEN filled + p_fill_amt >= amount THEN 'filled' ELSE 'open' END
        WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'filled', p_fill_amt, 'fee', v_fee);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric) TO authenticated;


-- ----- C.8 bling_mint: REVOKE only (service-role exclusive) -----
-- No body change; service_role retains implicit access.
REVOKE EXECUTE ON FUNCTION public.bling_mint(uuid, numeric) FROM PUBLIC;
-- DO NOT grant to authenticated. Stripe webhook → service_role only.

-- ----- C.9 bling_credit_purchase: REVOKE only (service-role exclusive) -----
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric) FROM PUBLIC;
-- DO NOT grant to authenticated. Stripe webhook → service_role only.


-- ----- C.10 bump_canonical_fetch_count: require auth -----
CREATE OR REPLACE FUNCTION public.bump_canonical_fetch_count(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthorized: must be signed in to bump fetch count';
    END IF;
    UPDATE public.canonical_documents
    SET    fetch_count = fetch_count + 1
    WHERE  slug = p_slug;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text) TO authenticated;


-- ----- C.11 increment_thread_reply_count: require auth -----
CREATE OR REPLACE FUNCTION public.increment_thread_reply_count(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthorized: must be signed in to increment reply count';
    END IF;
    UPDATE public.forum_threads
    SET    reply_count = reply_count + 1,
           last_activity_at = now()
    WHERE  id = p_thread_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid) TO authenticated;


-- ----- C.12 / C.13 trigger functions: REVOKE for hygiene -----
-- Triggers continue to fire regardless of EXECUTE grant.
REVOKE EXECUTE ON FUNCTION public.handle_forum_post_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_bee()           FROM PUBLIC;


-- =============================================================================
-- BLOCK D — Set search_path on 4 trigger/util functions (C4)
-- =============================================================================
ALTER FUNCTION public.refresh_realm_atom_counts()  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()             SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_bling_rank(numeric)  SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_bling_rank()         SET search_path = public, pg_temp;


-- =============================================================================
-- BLOCK E — Case-fold bees.email UNIQUE (C7)
-- =============================================================================
-- Pre-migration probe (executed 2026-05-06): no case-conflict variants present.
-- Replace UNIQUE constraint with case-insensitive unique index.

ALTER TABLE public.bees DROP CONSTRAINT IF EXISTS bees_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS bees_email_lower_idx ON public.bees (LOWER(email));


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT — NOT inside the txn)
-- =============================================================================
-- Verify the migration applied correctly. These queries should each return
-- the expected counts. Save this section as a separate verification script
-- for branch deployment.
--
-- -- Check 1: All 7 canon-data tables now have RLS enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('realms','atoms','atom_kettle_votes','atom_sources','atom_comments','entity_atom_links','entity_category_links');
-- -- Expected: rowsecurity = true for all 7
--
-- -- Check 2: bling_stripe_events has 2 policies
-- SELECT polname FROM pg_policy
-- WHERE polrelid = 'public.bling_stripe_events'::regclass;
-- -- Expected: bling_stripe_events_no_user_writes, bling_stripe_events_owner_read
--
-- -- Check 3: BLiNG! mutators have NO PUBLIC EXECUTE grant
-- SELECT proname,
--        has_function_privilege('PUBLIC', oid, 'EXECUTE') AS public_can_execute,
--        has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_can_execute,
--        has_function_privilege('anon', oid, 'EXECUTE') AS anon_can_execute
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('bling_mint','bling_credit_purchase','bling_send','bling_create_escrow',
--                   'bling_release_escrow','bling_cancel_escrow','bling_dispute_escrow',
--                   'bling_place_order','bling_fill_order','bump_canonical_fetch_count',
--                   'increment_thread_reply_count','handle_forum_post_insert','handle_new_bee')
-- ORDER BY proname;
-- -- Expected: public_can_execute = false for all 13
-- -- Expected: anon_can_execute = false for all 13
-- -- Expected: auth_can_execute = true for the 7 user-initiated + 2 defense-in-depth (=9 total)
-- -- Expected: auth_can_execute = false for bling_mint, bling_credit_purchase, handle_*
--
-- -- Check 4: search_path set on 4 functions
-- SELECT proname, proconfig FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('refresh_realm_atom_counts','set_updated_at','compute_bling_rank','refresh_bling_rank');
-- -- Expected: proconfig contains 'search_path=public, pg_temp' for all 4
--
-- -- Check 5: bees.email index exists, old constraint gone
-- SELECT indexname FROM pg_indexes WHERE tablename = 'bees' AND indexname = 'bees_email_lower_idx';
-- SELECT conname  FROM pg_constraint WHERE conrelid = 'public.bees'::regclass AND conname = 'bees_email_key';
-- -- Expected: index exists, constraint does not
--
-- -- Check 6: Test exploit attempt (must fail) — anon caller tries to mint
-- -- Run from a session WITHOUT JWT (simulate anon):
-- -- SELECT public.bling_mint('00000000-0000-0000-0000-000000000001'::uuid, 100);
-- -- Expected: ERROR — permission denied for function bling_mint

COMMIT;


-- =============================================================================
-- ROLLBACK (commented out — for reference only, do not run unless reverting)
-- =============================================================================
-- BEGIN;
--
-- -- Block A rollback
-- DROP POLICY IF EXISTS realms_read_all ON public.realms;
-- ALTER TABLE public.realms DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS atoms_read_all ON public.atoms;
-- ALTER TABLE public.atoms DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS entity_atom_links_read_all ON public.entity_atom_links;
-- ALTER TABLE public.entity_atom_links DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS entity_category_links_read_all ON public.entity_category_links;
-- ALTER TABLE public.entity_category_links DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS atom_kettle_votes_read_all ON public.atom_kettle_votes;
-- DROP POLICY IF EXISTS atom_kettle_votes_owner_insert ON public.atom_kettle_votes;
-- DROP POLICY IF EXISTS atom_kettle_votes_owner_update ON public.atom_kettle_votes;
-- DROP POLICY IF EXISTS atom_kettle_votes_owner_delete ON public.atom_kettle_votes;
-- ALTER TABLE public.atom_kettle_votes DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS atom_sources_read_all ON public.atom_sources;
-- DROP POLICY IF EXISTS atom_sources_owner_insert ON public.atom_sources;
-- DROP POLICY IF EXISTS atom_sources_owner_update ON public.atom_sources;
-- DROP POLICY IF EXISTS atom_sources_owner_delete ON public.atom_sources;
-- ALTER TABLE public.atom_sources DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS atom_comments_read_all ON public.atom_comments;
-- DROP POLICY IF EXISTS atom_comments_owner_insert ON public.atom_comments;
-- DROP POLICY IF EXISTS atom_comments_owner_update ON public.atom_comments;
-- DROP POLICY IF EXISTS atom_comments_owner_delete ON public.atom_comments;
-- ALTER TABLE public.atom_comments DISABLE ROW LEVEL SECURITY;
--
-- -- Block B rollback
-- DROP POLICY IF EXISTS bling_stripe_events_no_user_writes ON public.bling_stripe_events;
-- DROP POLICY IF EXISTS bling_stripe_events_owner_read    ON public.bling_stripe_events;
--
-- -- Block C rollback: re-grant EXECUTE TO PUBLIC, restore old function bodies from
-- -- pre-migration `pg_get_functiondef()` capture. (Capture saved separately;
-- -- automatic rollback would re-introduce the v8 vulnerable bodies — verify
-- -- intent before running.)
--
-- -- Block D rollback
-- ALTER FUNCTION public.refresh_realm_atom_counts()  RESET search_path;
-- ALTER FUNCTION public.set_updated_at()             RESET search_path;
-- ALTER FUNCTION public.compute_bling_rank(numeric)  RESET search_path;
-- ALTER FUNCTION public.refresh_bling_rank()         RESET search_path;
--
-- -- Block E rollback
-- DROP INDEX IF EXISTS public.bees_email_lower_idx;
-- ALTER TABLE public.bees ADD CONSTRAINT bees_email_key UNIQUE (email);
--
-- COMMIT;
