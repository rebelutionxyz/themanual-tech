-- F6 rehearsal finding: the webhook writes status 'error' (sync failure) and
-- 'unresolved' (no bee mapping), but the F2 CHECK only allowed
-- received/processed/failed/reversed — so the error path itself crashed
-- (500 retry storm, rows stuck at 'received'). Align the CHECK with the
-- function's full vocabulary.
ALTER TABLE public.stripe_events DROP CONSTRAINT stripe_events_status_check;

ALTER TABLE public.stripe_events ADD CONSTRAINT stripe_events_status_check
  CHECK (status = ANY (ARRAY['received','processed','failed','reversed','error','unresolved']));
