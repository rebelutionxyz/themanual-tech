-- =============================================================================
-- Migration 20260602182706 — Competition Engine v1 (schema + RPCs + RLS)
-- =============================================================================
-- Date:        2026-06-02
-- Author:      Code (Claude Opus 4.8) — DISPATCH: Competition Engine v1
-- Status:      APPLIED to production (anxmqiehpyznifqgskzc) 2026-06-02 as
--              version 20260602182706 (ratification gate cleared by OG HUMAN).
--              File renamed from the draft stamp 20260602120000 to the real prod
--              version for repo==prod ledger parity (2026-06-06).
-- NOTE:        comp_create_room as first applied at 182706 omitted join_code from
--              its INSERT (NOT NULL violation on call). Corrected in prod by the
--              companion migration 20260602182958_competition_engine_v1_fix_join_code.
--              The comp_create_room body in THIS file already carries the corrected
--              join_code-inclusive INSERT, so a from-scratch repo replay is safe and
--              never produces a callable-but-broken intermediate.
-- Source:      shared/canon/competition-stack-v1.md (Code-derived v1)
--              shared/canon/economy-v3-reconciliation-delta-2026-06-02.md (Sink #5)
--
-- Scope: The Bee Games shared competition engine. Brains Live Room first.
--        Game-agnostic (game default 'brains'), kind-agnostic (live_room|duel).
--
-- Money posture (Economy v3): Source = Royal Jelly well. Practice/casual rewards
--   are FREED from the well (total_supply rises, cap-checked). Stake/tournament
--   pools are escrowed from bee balances and redistributed; a 5% skim RETURNS to
--   Source (total_supply falls). Cap is conserved. Nothing is "minted".
--
-- RATIFICATION POINTS baked into this draft (see canon §7):
--   R1  bling_free() hard-guards auth.uid()=p_bee_id, so it CANNOT pay other
--       bees. comp_settle therefore INLINES the faucet (cap-checked total_supply
--       increment + balance credit + ledger row) for Source-funded rewards.
--   R2  Stake custody = competitions.prize_pool column (not a bling_pots row).
--   R3  Skim-to-Source = total_supply decrement, recorded in
--       competition_settlements.sink_to_source (Source = the well, not treasury
--       circulating balance).
--   R4  Built on the PRE-v3 substrate: hard cap 11222333222111 and (20,6) core
--       precision (matches deployed bling_free). New competition columns are
--       (24,6) for forward-compat. Full v3 economy migration is separate.
--   R5  question_bank.correct_idx must NOT leak to players. Base table is
--       readable only by creator/admin; players receive questions solely via
--       comp_serve_next_question (which omits correct_idx) and may browse the
--       sanitized question_bank_public VIEW. Deviates from the literal "live
--       rows readable" instruction for security.
--   R6  In stake/tournament modes the host is NOT auto-enrolled (would otherwise
--       win a Fibonacci pool share at zero stake). Host auto-enrolls only in
--       practice/casual; in stake modes the host joins via comp_join_room.
--   R7  A focus violation (focus_ok=false) on any answer flags the participant
--       forfeited=true, excluding them from stake-pool distribution (anti-cheat).
--
-- Idempotency: CREATE ... IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
--   Single BEGIN/COMMIT — all-or-nothing.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- Pre-flight: required substrate must exist.
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='bees'
                      AND column_name='bling_balance') THEN
        RAISE EXCEPTION 'Pre-flight failed: bees.bling_balance absent.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='bling_system_state') THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_system_state absent.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bling_system_state WHERE id=1) THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_system_state row id=1 absent.';
    END IF;
    RAISE NOTICE 'Pre-flight OK.';
END $$;


-- =============================================================================
-- BLOCK A — Extend bling_transactions.type CHECK with competition values.
-- Preserves all 21 existing values; appends 4. Safe drop+add (no rows yet hold
-- the new values).
-- =============================================================================
ALTER TABLE public.bling_transactions DROP CONSTRAINT IF EXISTS bling_transactions_type_check;
ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check
    CHECK (type IN (
        'free','send_debit','send_credit',
        'escrow_hold','escrow_release','escrow_cancel','escrow_dispute',
        'order_reserve','order_fill_debit','order_fill_credit',
        'order_cancel_refund','order_donation',
        'stripe_credit','chargeback',
        'escrow_in','escrow_unlock','newbee_bonus',
        'atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw',
        'atlasoracle_directive','atlasoracle_refund',
        -- New competition values:
        'competition_stake_escrow','competition_stake_refund',
        'competition_source_reward','competition_payout'
    ));


-- =============================================================================
-- BLOCK B — Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.competitions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL DEFAULT 'live_room' CHECK (kind IN ('live_room','duel')),
    game         TEXT NOT NULL DEFAULT 'brains',
    host_bee_id  UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    mode         TEXT NOT NULL DEFAULT 'casual'
                 CHECK (mode IN ('practice','casual','stake','tournament')),
    status       TEXT NOT NULL DEFAULT 'lobby'
                 CHECK (status IN ('lobby','active','settling','complete')),
    realm        TEXT NULL,
    category     TEXT NULL,
    stake_amount NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK (stake_amount >= 0),
    prize_pool   NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
    join_code    TEXT NOT NULL UNIQUE,
    settings     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ NULL,
    ended_at     TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS competitions_host_idx   ON public.competitions (host_bee_id);
CREATE INDEX IF NOT EXISTS competitions_status_idx ON public.competitions (status);

CREATE TABLE IF NOT EXISTS public.competition_participants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    bee_id         UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    stake_escrowed NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK (stake_escrowed >= 0),
    score          INTEGER NOT NULL DEFAULT 0,
    correct_count  INTEGER NOT NULL DEFAULT 0,
    wrong_count    INTEGER NOT NULL DEFAULT 0,
    final_rank     INTEGER NULL,
    payout         NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK (payout >= 0),
    forfeited      BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (competition_id, bee_id)
);
CREATE INDEX IF NOT EXISTS comp_participants_comp_idx ON public.competition_participants (competition_id);
CREATE INDEX IF NOT EXISTS comp_participants_bee_idx  ON public.competition_participants (bee_id);

CREATE TABLE IF NOT EXISTS public.question_bank (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm          TEXT NULL,
    prompt         TEXT NOT NULL,
    choices        JSONB NOT NULL,
    correct_idx    INTEGER NOT NULL,
    difficulty     INTEGER NOT NULL DEFAULT 1,
    source         TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','atom','sourcer')),
    creator_bee_id UUID NULL REFERENCES public.bees(id) ON DELETE SET NULL,
    status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','live')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_bank_status_realm_idx ON public.question_bank (status, realm);

CREATE TABLE IF NOT EXISTS public.competition_questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    question_id    UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    sequence       INTEGER NOT NULL,
    served_at      TIMESTAMPTZ NULL,
    deadline_at    TIMESTAMPTZ NULL,
    UNIQUE (competition_id, sequence),
    UNIQUE (competition_id, question_id)
);
CREATE INDEX IF NOT EXISTS comp_questions_comp_idx ON public.competition_questions (competition_id);

CREATE TABLE IF NOT EXISTS public.competition_answers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    question_id    UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    bee_id         UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    answer_idx     INTEGER NULL,
    is_correct     BOOLEAN NOT NULL DEFAULT false,
    answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    response_ms    INTEGER NULL,
    speed_rank     INTEGER NULL,
    awarded        NUMERIC(24,6) NOT NULL DEFAULT 0 CHECK (awarded >= 0),
    forfeit_reason TEXT NULL,
    UNIQUE (competition_id, question_id, bee_id)
);
CREATE INDEX IF NOT EXISTS comp_answers_comp_q_idx ON public.competition_answers (competition_id, question_id);
CREATE INDEX IF NOT EXISTS comp_answers_bee_idx    ON public.competition_answers (competition_id, bee_id);

CREATE TABLE IF NOT EXISTS public.competition_settlements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL UNIQUE REFERENCES public.competitions(id) ON DELETE CASCADE,
    source_in      NUMERIC(24,6) NOT NULL DEFAULT 0,
    pot_total      NUMERIC(24,6) NOT NULL DEFAULT 0,
    sink_to_source NUMERIC(24,6) NOT NULL DEFAULT 0,
    settled_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- BLOCK C — Helper functions
-- =============================================================================

-- Fibonacci speed/rank multiplier: 5 / 3 / 2 / 1 / 1  (rank 4+ -> 1).
CREATE OR REPLACE FUNCTION public.fib_speed_multiplier(p_rank integer)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
    SELECT (CASE
        WHEN p_rank IS NULL OR p_rank <= 0 THEN 0
        WHEN p_rank = 1 THEN 5
        WHEN p_rank = 2 THEN 3
        WHEN p_rank = 3 THEN 2
        ELSE 1
    END)::numeric;
$$;

-- Leaderboard: non-forfeited ahead of forfeited; then score DESC; tiebreak by
-- total response time ASC (faster overall wins ties).
CREATE OR REPLACE FUNCTION public.comp_leaderboard(p_competition_id uuid)
RETURNS TABLE (
    bee_id            uuid,
    score             integer,
    correct_count     integer,
    total_response_ms bigint,
    final_rank        integer,
    forfeited         boolean
) LANGUAGE sql STABLE AS $$
    SELECT
        p.bee_id,
        p.score,
        p.correct_count,
        COALESCE((SELECT sum(a.response_ms) FROM public.competition_answers a
                   WHERE a.competition_id = p.competition_id AND a.bee_id = p.bee_id), 0)::bigint,
        RANK() OVER (
            ORDER BY p.forfeited ASC, p.score DESC,
                     COALESCE((SELECT sum(a.response_ms) FROM public.competition_answers a
                                WHERE a.competition_id = p.competition_id AND a.bee_id = p.bee_id), 0) ASC
        )::integer,
        p.forfeited
    FROM public.competition_participants p
    WHERE p.competition_id = p_competition_id;
$$;


-- =============================================================================
-- BLOCK D — RPCs
-- =============================================================================

-- ---- comp_create_room ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comp_create_room(
    p_game     text    DEFAULT 'brains',
    p_mode     text    DEFAULT 'casual',
    p_realm    text    DEFAULT NULL,
    p_stake    numeric DEFAULT 0,
    p_settings jsonb   DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller   uuid := auth.uid();
    v_code     text;
    v_id       uuid;
    v_attempts int := 0;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF p_mode NOT IN ('practice','casual','stake','tournament') THEN
        RAISE EXCEPTION 'invalid mode %', p_mode;
    END IF;
    IF p_mode IN ('stake','tournament') AND (p_stake IS NULL OR p_stake <= 0) THEN
        RAISE EXCEPTION 'stake modes require a positive stake_amount';
    END IF;

    LOOP
        v_attempts := v_attempts + 1;
        v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.competitions WHERE join_code = v_code);
        IF v_attempts > 25 THEN RAISE EXCEPTION 'could not generate a unique join code'; END IF;
    END LOOP;

    INSERT INTO public.competitions (kind, game, host_bee_id, mode, status, realm, stake_amount, join_code, settings)
    VALUES ('live_room', COALESCE(p_game,'brains'), v_caller, p_mode, 'lobby',
            p_realm, COALESCE(p_stake,0), v_code, COALESCE(p_settings,'{}'::jsonb))
    RETURNING id INTO v_id;

    -- R6: auto-enroll host only in free modes; stake-mode hosts join (and stake)
    -- explicitly via comp_join_room so they cannot win a pool share at 0 stake.
    IF p_mode IN ('practice','casual') THEN
        INSERT INTO public.competition_participants (competition_id, bee_id)
        VALUES (v_id, v_caller);
    END IF;

    RETURN jsonb_build_object('ok', true, 'competition_id', v_id,
                              'join_code', v_code, 'mode', p_mode, 'status', 'lobby');
END;
$function$;

-- ---- comp_join_room --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comp_join_room(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller        uuid := auth.uid();
    v_comp          public.competitions%ROWTYPE;
    v_balance       numeric(24,6);
    v_balance_after numeric(24,6);
    v_pid           uuid;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

    SELECT * INTO v_comp FROM public.competitions
     WHERE join_code = upper(p_join_code) FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'no room with join code %', p_join_code; END IF;
    IF v_comp.status <> 'lobby' THEN
        RAISE EXCEPTION 'room % is not joinable (status=%)', v_comp.id, v_comp.status;
    END IF;
    IF EXISTS (SELECT 1 FROM public.competition_participants
                WHERE competition_id = v_comp.id AND bee_id = v_caller) THEN
        RAISE EXCEPTION 'already joined this room';
    END IF;

    IF v_comp.mode IN ('stake','tournament') THEN
        SELECT bling_balance INTO v_balance FROM public.bees WHERE id = v_caller FOR UPDATE;
        IF v_balance IS NULL THEN RAISE EXCEPTION 'bee % not found', v_caller; END IF;
        IF v_balance < v_comp.stake_amount THEN
            RAISE EXCEPTION 'insufficient balance to stake (% < %)', v_balance, v_comp.stake_amount;
        END IF;

        UPDATE public.bees SET bling_balance = bling_balance - v_comp.stake_amount
         WHERE id = v_caller RETURNING bling_balance INTO v_balance_after;
        UPDATE public.competitions SET prize_pool = prize_pool + v_comp.stake_amount
         WHERE id = v_comp.id;

        INSERT INTO public.competition_participants (competition_id, bee_id, stake_escrowed)
        VALUES (v_comp.id, v_caller, v_comp.stake_amount) RETURNING id INTO v_pid;

        INSERT INTO public.bling_transactions
            (bee_id, type, amount, balance_after, source_type, source_ref, memo)
        VALUES
            (v_caller, 'competition_stake_escrow', -v_comp.stake_amount, v_balance_after,
             'competition_stake_escrow', v_comp.id, 'Bee Games stake escrowed');
    ELSE
        INSERT INTO public.competition_participants (competition_id, bee_id)
        VALUES (v_comp.id, v_caller) RETURNING id INTO v_pid;
    END IF;

    RETURN jsonb_build_object('ok', true, 'competition_id', v_comp.id,
        'participant_id', v_pid, 'mode', v_comp.mode,
        'stake_escrowed', CASE WHEN v_comp.mode IN ('stake','tournament')
                               THEN v_comp.stake_amount ELSE 0 END);
END;
$function$;

-- ---- comp_serve_next_question ---------------------------------------------
CREATE OR REPLACE FUNCTION public.comp_serve_next_question(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller        uuid := auth.uid();
    v_is_service    boolean := (auth.role() = 'service_role');
    v_comp          public.competitions%ROWTYPE;
    v_cq            public.competition_questions%ROWTYPE;
    v_q             public.question_bank%ROWTYPE;
    v_next_seq      integer;
    v_deadline_secs integer;
    v_deadline      timestamptz;
BEGIN
    SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'competition % not found', p_competition_id; END IF;
    IF NOT v_is_service AND v_caller IS DISTINCT FROM v_comp.host_bee_id THEN
        RAISE EXCEPTION 'only the host or engine may serve questions';
    END IF;
    IF v_comp.status NOT IN ('lobby','active') THEN
        RAISE EXCEPTION 'cannot serve a question in status %', v_comp.status;
    END IF;

    v_deadline_secs := COALESCE((v_comp.settings->>'question_seconds')::int, 20);
    v_deadline := now() + make_interval(secs => v_deadline_secs);

    -- 1) pre-bound, unserved question takes priority
    SELECT * INTO v_cq FROM public.competition_questions
     WHERE competition_id = p_competition_id AND served_at IS NULL
     ORDER BY sequence ASC LIMIT 1;

    IF v_cq.id IS NULL THEN
        -- 2) pull a live bank question in realm, not already bound to this room
        SELECT * INTO v_q FROM public.question_bank qb
         WHERE qb.status = 'live'
           AND (v_comp.realm IS NULL OR qb.realm = v_comp.realm)
           AND NOT EXISTS (SELECT 1 FROM public.competition_questions cq
                            WHERE cq.competition_id = p_competition_id AND cq.question_id = qb.id)
         ORDER BY md5(qb.id::text || p_competition_id::text) LIMIT 1;
        IF v_q.id IS NULL THEN
            RAISE EXCEPTION 'no live questions available for realm %', COALESCE(v_comp.realm,'(any)');
        END IF;
        SELECT COALESCE(max(sequence),0) + 1 INTO v_next_seq
          FROM public.competition_questions WHERE competition_id = p_competition_id;
        INSERT INTO public.competition_questions (competition_id, question_id, sequence, served_at, deadline_at)
        VALUES (p_competition_id, v_q.id, v_next_seq, now(), v_deadline)
        RETURNING * INTO v_cq;
    ELSE
        UPDATE public.competition_questions SET served_at = now(), deadline_at = v_deadline
         WHERE id = v_cq.id RETURNING * INTO v_cq;
        SELECT * INTO v_q FROM public.question_bank WHERE id = v_cq.question_id;
    END IF;

    IF v_comp.status = 'lobby' THEN
        UPDATE public.competitions SET status = 'active', started_at = COALESCE(started_at, now())
         WHERE id = p_competition_id;
    END IF;

    -- correct_idx intentionally NOT returned (R5: would leak the answer).
    RETURN jsonb_build_object('ok', true, 'competition_id', p_competition_id,
        'competition_question_id', v_cq.id, 'question_id', v_q.id,
        'sequence', v_cq.sequence, 'realm', v_q.realm, 'prompt', v_q.prompt,
        'choices', v_q.choices, 'difficulty', v_q.difficulty, 'deadline_at', v_cq.deadline_at);
END;
$function$;

-- ---- comp_submit_answer ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.comp_submit_answer(
    p_competition_id uuid,
    p_question_id    uuid,
    p_answer_idx     integer,
    p_response_ms    integer,
    p_focus_ok       boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller         uuid := auth.uid();
    v_cq_id          uuid;
    v_deadline       timestamptz;
    v_correct_idx    integer;
    v_is_correct     boolean;
    v_forfeit        boolean := false;
    v_forfeit_reason text := NULL;
    v_speed_rank     integer := NULL;
    v_awarded        numeric(24,6) := 0;
    v_now            timestamptz := now();
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.competition_participants
                    WHERE competition_id = p_competition_id AND bee_id = v_caller) THEN
        RAISE EXCEPTION 'not a participant in competition %', p_competition_id;
    END IF;

    SELECT cq.id, cq.deadline_at, qb.correct_idx
      INTO v_cq_id, v_deadline, v_correct_idx
      FROM public.competition_questions cq
      JOIN public.question_bank qb ON qb.id = cq.question_id
     WHERE cq.competition_id = p_competition_id AND cq.question_id = p_question_id;
    IF v_cq_id IS NULL THEN
        RAISE EXCEPTION 'question % has not been served in competition %', p_question_id, p_competition_id;
    END IF;

    -- serialize speed_rank assignment across concurrent submissions
    PERFORM 1 FROM public.competition_questions WHERE id = v_cq_id FOR UPDATE;

    v_is_correct := (p_answer_idx = v_correct_idx);

    IF p_focus_ok IS DISTINCT FROM true THEN
        v_forfeit := true; v_forfeit_reason := 'focus_lost';
    ELSIF v_deadline IS NOT NULL AND v_now > v_deadline THEN
        v_forfeit := true; v_forfeit_reason := 'past_deadline';
    END IF;

    IF v_forfeit THEN
        v_is_correct := false;
        v_awarded := 0;
    ELSIF v_is_correct THEN
        SELECT count(*) + 1 INTO v_speed_rank
          FROM public.competition_answers
         WHERE competition_id = p_competition_id AND question_id = p_question_id
           AND is_correct = true AND forfeit_reason IS NULL;
        v_awarded := public.fib_speed_multiplier(v_speed_rank);
    END IF;

    INSERT INTO public.competition_answers
        (competition_id, question_id, bee_id, answer_idx, is_correct,
         answered_at, response_ms, speed_rank, awarded, forfeit_reason)
    VALUES
        (p_competition_id, p_question_id, v_caller, p_answer_idx, v_is_correct,
         v_now, p_response_ms, v_speed_rank, v_awarded, v_forfeit_reason);

    UPDATE public.competition_participants
       SET score         = score + CASE WHEN v_is_correct THEN v_awarded::int ELSE 0 END,
           correct_count = correct_count + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
           wrong_count   = wrong_count   + CASE WHEN (NOT v_is_correct) AND (NOT v_forfeit) THEN 1 ELSE 0 END,
           forfeited     = forfeited OR v_forfeit   -- R7: focus violation taints participant
     WHERE competition_id = p_competition_id AND bee_id = v_caller;

    RETURN jsonb_build_object('ok', true, 'is_correct', v_is_correct,
        'forfeit', v_forfeit, 'forfeit_reason', v_forfeit_reason,
        'speed_rank', v_speed_rank, 'awarded', v_awarded);
END;
$function$;

-- ---- comp_settle -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comp_settle(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller        uuid := auth.uid();
    v_is_service    boolean := (auth.role() = 'service_role');
    v_comp          public.competitions%ROWTYPE;
    v_rec           record;
    v_pot           numeric(24,6);
    v_skim          numeric(24,6) := 0;
    v_distributable numeric(24,6) := 0;
    v_source_in     numeric(24,6) := 0;
    v_sum_weights   numeric(24,6) := 0;
    v_allocated     numeric(24,6) := 0;
    v_pay           numeric(24,6);
    v_balance_after numeric(24,6);
    v_total_supply  numeric(20,6);
    v_new_total     numeric(20,6);
    v_hard_cap      constant numeric := 11222333222111;  -- R4: matches deployed bling_free
    v_top_bee       uuid := NULL;
BEGIN
    SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'competition % not found', p_competition_id; END IF;
    IF NOT v_is_service AND v_caller IS DISTINCT FROM v_comp.host_bee_id THEN
        RAISE EXCEPTION 'only the host or engine may settle';
    END IF;
    IF v_comp.status = 'complete' THEN RAISE EXCEPTION 'competition % already settled', p_competition_id; END IF;
    IF v_comp.status NOT IN ('active','settling') THEN
        RAISE EXCEPTION 'cannot settle in status %', v_comp.status;
    END IF;

    UPDATE public.competitions SET status = 'settling' WHERE id = p_competition_id;

    -- assign final ranks from the leaderboard
    FOR v_rec IN SELECT * FROM public.comp_leaderboard(p_competition_id) LOOP
        UPDATE public.competition_participants SET final_rank = v_rec.final_rank
         WHERE competition_id = p_competition_id AND bee_id = v_rec.bee_id;
    END LOOP;

    IF v_comp.mode IN ('practice','casual') THEN
        -- R1: Source-funded. payout = Σ awarded; FREED from the well (cap-checked).
        SELECT total_supply INTO v_total_supply FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
        FOR v_rec IN
            SELECT p.bee_id,
                   COALESCE(sum(a.awarded), 0)::numeric(24,6) AS due
              FROM public.competition_participants p
              LEFT JOIN public.competition_answers a
                ON a.competition_id = p.competition_id AND a.bee_id = p.bee_id
               AND a.is_correct = true AND a.forfeit_reason IS NULL
             WHERE p.competition_id = p_competition_id
             GROUP BY p.bee_id
        LOOP
            IF v_rec.due > 0 THEN
                v_new_total := v_total_supply + v_rec.due;
                IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'Source payout would exceed hard cap'; END IF;
                v_total_supply := v_new_total;
                UPDATE public.bees SET bling_balance = bling_balance + v_rec.due
                 WHERE id = v_rec.bee_id RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout = v_rec.due
                 WHERE competition_id = p_competition_id AND bee_id = v_rec.bee_id;
                INSERT INTO public.bling_transactions
                    (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES
                    (v_rec.bee_id, 'competition_source_reward', v_rec.due, v_balance_after,
                     'competition_source_reward', p_competition_id, 'Bee Games reward (Source-funded)');
                v_source_in := v_source_in + v_rec.due;
            END IF;
        END LOOP;
        UPDATE public.bling_system_state SET total_supply = v_total_supply WHERE id = 1;
        v_pot := 0;

    ELSE
        -- stake/tournament: redistribute prize_pool by Fibonacci-over-rank, 5% skim.
        v_pot := v_comp.prize_pool;
        v_skim := round(v_pot * 0.05, 6);
        v_distributable := v_pot - v_skim;

        SELECT COALESCE(sum(public.fib_speed_multiplier(final_rank)), 0) INTO v_sum_weights
          FROM public.competition_participants
         WHERE competition_id = p_competition_id AND forfeited = false AND final_rank IS NOT NULL;

        IF v_sum_weights > 0 AND v_distributable > 0 THEN
            FOR v_rec IN
                SELECT bee_id, final_rank FROM public.competition_participants
                 WHERE competition_id = p_competition_id AND forfeited = false AND final_rank IS NOT NULL
                 ORDER BY final_rank ASC
            LOOP
                v_pay := round(v_distributable * public.fib_speed_multiplier(v_rec.final_rank) / v_sum_weights, 6);
                v_allocated := v_allocated + v_pay;
                IF v_top_bee IS NULL THEN v_top_bee := v_rec.bee_id; END IF;
                UPDATE public.bees SET bling_balance = bling_balance + v_pay
                 WHERE id = v_rec.bee_id RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout = v_pay
                 WHERE competition_id = p_competition_id AND bee_id = v_rec.bee_id;
                INSERT INTO public.bling_transactions
                    (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES
                    (v_rec.bee_id, 'competition_payout', v_pay, v_balance_after,
                     'competition_payout', p_competition_id, 'Bee Games prize-pool award');
            END LOOP;

            -- rounding remainder to the top-ranked bee so Σpayout + skim == pot
            IF v_allocated <> v_distributable AND v_top_bee IS NOT NULL THEN
                v_pay := v_distributable - v_allocated;
                UPDATE public.bees SET bling_balance = bling_balance + v_pay
                 WHERE id = v_top_bee RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout = payout + v_pay
                 WHERE competition_id = p_competition_id AND bee_id = v_top_bee;
                INSERT INTO public.bling_transactions
                    (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES
                    (v_top_bee, 'competition_payout', v_pay, v_balance_after,
                     'competition_payout', p_competition_id, 'Bee Games prize-pool award (rounding remainder)');
                v_allocated := v_distributable;
            END IF;
        ELSE
            -- no eligible winners: entire pot returns to Source
            v_skim := v_pot;
            v_distributable := 0;
        END IF;

        -- R3: skim returns to Source — un-free from circulation.
        IF v_skim > 0 THEN
            UPDATE public.bling_system_state SET total_supply = greatest(total_supply - v_skim, 0) WHERE id = 1;
        END IF;
    END IF;

    INSERT INTO public.competition_settlements (competition_id, source_in, pot_total, sink_to_source)
    VALUES (p_competition_id, v_source_in, v_pot, v_skim)
    ON CONFLICT (competition_id) DO UPDATE
        SET source_in = EXCLUDED.source_in, pot_total = EXCLUDED.pot_total,
            sink_to_source = EXCLUDED.sink_to_source, settled_at = now();

    UPDATE public.competitions SET status = 'complete', ended_at = now() WHERE id = p_competition_id;

    RETURN jsonb_build_object('ok', true, 'competition_id', p_competition_id, 'mode', v_comp.mode,
        'source_in', v_source_in, 'pot_total', v_pot, 'sink_to_source', v_skim, 'distributed', v_allocated);
END;
$function$;


-- =============================================================================
-- BLOCK E — RLS (balances stay private; engine reads are member-scoped)
-- =============================================================================
ALTER TABLE public.competitions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_settlements ENABLE ROW LEVEL SECURITY;

-- competitions: host or participant may read; host may update. Writes go via RPC.
DROP POLICY IF EXISTS competitions_select_member ON public.competitions;
CREATE POLICY competitions_select_member ON public.competitions FOR SELECT TO authenticated
USING (host_bee_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.competition_participants p
                   WHERE p.competition_id = id AND p.bee_id = auth.uid()));

DROP POLICY IF EXISTS competitions_update_host ON public.competitions;
CREATE POLICY competitions_update_host ON public.competitions FOR UPDATE TO authenticated
USING (host_bee_id = auth.uid()) WITH CHECK (host_bee_id = auth.uid());

-- competition_participants: own row or host of the competition.
DROP POLICY IF EXISTS comp_participants_select ON public.competition_participants;
CREATE POLICY comp_participants_select ON public.competition_participants FOR SELECT TO authenticated
USING (bee_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.competitions c
                   WHERE c.id = competition_id AND c.host_bee_id = auth.uid()));

-- competition_answers: own row or host.
DROP POLICY IF EXISTS comp_answers_select ON public.competition_answers;
CREATE POLICY comp_answers_select ON public.competition_answers FOR SELECT TO authenticated
USING (bee_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.competitions c
                   WHERE c.id = competition_id AND c.host_bee_id = auth.uid()));

-- competition_questions: participants + host of the competition (no answer here).
DROP POLICY IF EXISTS comp_questions_select ON public.competition_questions;
CREATE POLICY comp_questions_select ON public.competition_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.competitions c
                WHERE c.id = competition_id
                  AND (c.host_bee_id = auth.uid()
                       OR EXISTS (SELECT 1 FROM public.competition_participants p
                                   WHERE p.competition_id = c.id AND p.bee_id = auth.uid()))));

-- competition_settlements: host + participants.
DROP POLICY IF EXISTS comp_settlements_select ON public.competition_settlements;
CREATE POLICY comp_settlements_select ON public.competition_settlements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.competitions c
                WHERE c.id = competition_id
                  AND (c.host_bee_id = auth.uid()
                       OR EXISTS (SELECT 1 FROM public.competition_participants p
                                   WHERE p.competition_id = c.id AND p.bee_id = auth.uid()))));

-- question_bank (R5): base table NEVER exposes correct_idx to players. Only the
-- creator or an admin can read/modify it. Players consume questions via
-- comp_serve_next_question (no correct_idx) or the sanitized view below.
DROP POLICY IF EXISTS question_bank_select_owner ON public.question_bank;
CREATE POLICY question_bank_select_owner ON public.question_bank FOR SELECT TO authenticated
USING (creator_bee_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.bees b WHERE b.id = auth.uid() AND b.is_admin = true));

DROP POLICY IF EXISTS question_bank_insert_owner ON public.question_bank;
CREATE POLICY question_bank_insert_owner ON public.question_bank FOR INSERT TO authenticated
WITH CHECK (creator_bee_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.bees b WHERE b.id = auth.uid() AND b.is_admin = true));

DROP POLICY IF EXISTS question_bank_update_owner ON public.question_bank;
CREATE POLICY question_bank_update_owner ON public.question_bank FOR UPDATE TO authenticated
USING (creator_bee_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.bees b WHERE b.id = auth.uid() AND b.is_admin = true))
WITH CHECK (creator_bee_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.bees b WHERE b.id = auth.uid() AND b.is_admin = true));

-- Sanitized public view of LIVE questions — no correct_idx. View is owned by the
-- migration runner (non-invoker) so it bypasses base-table RLS but exposes only
-- safe columns.
CREATE OR REPLACE VIEW public.question_bank_public AS
    SELECT id, realm, prompt, choices, difficulty, status, created_at
      FROM public.question_bank
     WHERE status = 'live';


-- =============================================================================
-- BLOCK F — Grants
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.fib_speed_multiplier(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fib_speed_multiplier(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_leaderboard(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_leaderboard(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_create_room(text,text,text,numeric,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_create_room(text,text,text,numeric,jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_join_room(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_join_room(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_serve_next_question(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_serve_next_question(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_submit_answer(uuid,uuid,integer,integer,boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_submit_answer(uuid,uuid,integer,integer,boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.comp_settle(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.comp_settle(uuid) TO authenticated, service_role;

GRANT SELECT ON public.question_bank_public TO authenticated, service_role;

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER commit, NOT in the txn)
-- =============================================================================
-- 1) Tables + RLS:
--    SELECT tablename, rowsecurity FROM pg_tables
--     WHERE schemaname='public' AND tablename LIKE 'competition%' OR tablename='question_bank';
-- 2) RPCs present:
--    SELECT proname FROM pg_proc WHERE proname LIKE 'comp\_%' OR proname='fib_speed_multiplier';
-- 3) Conservation invariant after a settle:
--    casual  -> Δtotal_supply == Σ competition_settlements.source_in
--    stake   -> Σ participant.payout + settlement.sink_to_source == settlement.pot_total
--               and Δtotal_supply == -settlement.sink_to_source
--
-- =============================================================================
-- ROLLBACK (reference only — DROP of brand-new empty objects)
-- =============================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS public.question_bank_public;
-- DROP FUNCTION IF EXISTS public.comp_settle(uuid);
-- DROP FUNCTION IF EXISTS public.comp_submit_answer(uuid,uuid,integer,integer,boolean);
-- DROP FUNCTION IF EXISTS public.comp_serve_next_question(uuid);
-- DROP FUNCTION IF EXISTS public.comp_join_room(text);
-- DROP FUNCTION IF EXISTS public.comp_create_room(text,text,text,numeric,jsonb);
-- DROP FUNCTION IF EXISTS public.comp_leaderboard(uuid);
-- DROP FUNCTION IF EXISTS public.fib_speed_multiplier(integer);
-- DROP TABLE IF EXISTS public.competition_settlements;
-- DROP TABLE IF EXISTS public.competition_answers;
-- DROP TABLE IF EXISTS public.competition_questions;
-- DROP TABLE IF EXISTS public.question_bank;
-- DROP TABLE IF EXISTS public.competition_participants;
-- DROP TABLE IF EXISTS public.competitions;
-- -- (bling_transactions_type_check reverts to the prior 21-value list)
-- COMMIT;
