-- ROUTEREPOINT1 — rollback for 20260819120932_routerepoint1_model_card_v1.sql.
-- Drops the read-only dispatch+billing card function. Nothing else references it
-- after a route rollback, so this is a clean DROP.
BEGIN;
DROP FUNCTION IF EXISTS public.h24_route_model_card(text);
COMMIT;
