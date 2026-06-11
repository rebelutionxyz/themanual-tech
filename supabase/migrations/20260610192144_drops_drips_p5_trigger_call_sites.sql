-- DROPS/DRIPS P5 — TRIGGER CALL SITES (locked Jun 10 2026)
-- SQL-resident wiring for record_drop / record_drip. Ratified decisions:
--   * escrow_complete earner = recipient_id; terminal success = status 'released'
--   * reply_substantive substance gate = body >= 100 chars (reply_received drip
--     fires on ANY reply to the thread creator)
--   * bazaar_offer gated to listing_type='offer'
-- ref_for() = SQL mirror of TS refFor(): uuid_v5(HONEYCOMB_NS, kind:id),
-- byte-identical across lanes — idempotency rides record_*'s dedup_key.
-- All triggers best-effort: a Drops/Drips failure WARNs, never breaks the write.
-- gov_vote is TS-lane (manual-atom-kettle-vote v6). DEFERRED actions stay deferred.

CREATE FUNCTION public.ref_for(p_kind text, p_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT extensions.uuid_generate_v5('a7f3c1d2-0b44-4e6a-9c2e-1f0e5b3a8d61'::uuid, p_kind || ':' || p_id) $$;

CREATE FUNCTION public.trg_drops_thread_original() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
BEGIN
  PERFORM public.record_drop(NEW.created_by, 'thread_original', public.ref_for('forum_thread', NEW.id::text));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drops trigger thread_original failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drops_thread_original AFTER INSERT ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.trg_drops_thread_original();

CREATE FUNCTION public.trg_drops_drips_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_creator uuid; v_ref uuid;
BEGIN
  v_ref := public.ref_for('forum_post', NEW.id::text);
  IF char_length(btrim(COALESCE(NEW.body,''))) >= 100 THEN
    PERFORM public.record_drop(NEW.bee_id, 'reply_substantive', v_ref);
  END IF;
  SELECT created_by INTO v_creator FROM public.forum_threads WHERE id = NEW.thread_id;
  IF v_creator IS NOT NULL THEN
    PERFORM public.record_drip(v_creator, 'reply_received', NEW.bee_id, v_ref, NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drops/drips trigger reply failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drops_drips_reply AFTER INSERT ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_drops_drips_reply();

CREATE FUNCTION public.trg_drops_escrow_complete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'released' THEN
    PERFORM public.record_drop(NEW.recipient_id, 'escrow_complete', public.ref_for('escrow', NEW.id::text));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drops trigger escrow_complete failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drops_escrow_complete AFTER UPDATE ON public.bling_escrows
FOR EACH ROW EXECUTE FUNCTION public.trg_drops_escrow_complete();

CREATE FUNCTION public.trg_drops_bazaar_offer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
BEGIN
  IF lower(COALESCE(NEW.listing_type,'')) = 'offer' THEN
    PERFORM public.record_drop(NEW.offered_by, 'bazaar_offer', public.ref_for('bazaar_offer', NEW.id::text));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drops trigger bazaar_offer failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drops_bazaar_offer AFTER INSERT ON public.bazaar_listings
FOR EACH ROW EXECUTE FUNCTION public.trg_drops_bazaar_offer();

CREATE FUNCTION public.resolve_content_creator(p_source_id text)
RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE v_uuid uuid; v_creator uuid;
BEGIN
  BEGIN v_uuid := p_source_id::uuid; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
  SELECT created_by INTO v_creator FROM public.forum_threads WHERE id = v_uuid;
  IF v_creator IS NOT NULL THEN RETURN v_creator; END IF;
  SELECT bee_id INTO v_creator FROM public.forum_posts WHERE id = v_uuid;
  RETURN v_creator;
END $$;

CREATE FUNCTION public.trg_drips_emoji_react() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_creator uuid;
BEGIN
  v_creator := public.resolve_content_creator(NEW.source_id);
  IF v_creator IS NOT NULL THEN
    PERFORM public.record_drip(v_creator, 'emoji_react', NEW.bee_id, public.ref_for('reaction', NEW.id::text), NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drips trigger emoji_react failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drips_emoji_react AFTER INSERT ON public.entity_reactions
FOR EACH ROW EXECUTE FUNCTION public.trg_drips_emoji_react();

CREATE FUNCTION public.trg_drips_saved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_creator uuid;
BEGIN
  v_creator := public.resolve_content_creator(NEW.source_id);
  IF v_creator IS NOT NULL THEN
    PERFORM public.record_drip(v_creator, 'saved', NEW.bee_id, public.ref_for('save', NEW.id::text), NULL);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'drips trigger saved failed: %', SQLERRM; RETURN NEW;
END $$;

CREATE TRIGGER drips_saved AFTER INSERT ON public.entity_saves
FOR EACH ROW EXECUTE FUNCTION public.trg_drips_saved();
