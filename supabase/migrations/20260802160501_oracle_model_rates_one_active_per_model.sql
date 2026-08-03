-- BUTCH RULING 2026-08-02: one active rate per model, enforced in schema.
-- Context: three PLACEHOLDER rows (marked "NOT A PRICING RULING") sat active=true beside the
-- ruled rows from 2026-07-27 20:04Z. The router selects by newest-active, so a re-activated
-- placeholder would have charged sonnet at 4,000/20,000 against a ruled 9,000/45,000 - a 56%
-- underprice on the money path, silently, with no error. The placeholders have since been
-- deactivated; this index makes the condition that allowed it structurally impossible.
--
-- SCOPE, deliberately narrow: a rate is a property of the MODEL. Per-ACCOUNT adjustments
-- (owner comp, family comp, influencer test, whale preview) are a property of the BEE and do
-- NOT belong here - they are designed in DOCS17 and applied at the debit, not the lookup.
-- This index does not constrain them.
--
-- COST: re-pricing becomes two statements and the order matters - deactivate the live row,
-- then insert the new one. Doing it backwards now fails loudly instead of double-charging quietly.
--
-- ROLLBACK: DROP INDEX IF EXISTS public.oracle_model_rates_one_active_per_model;
CREATE UNIQUE INDEX oracle_model_rates_one_active_per_model
  ON public.oracle_model_rates (model_name) WHERE active;

COMMENT ON INDEX public.oracle_model_rates_one_active_per_model IS
  'One active rate per model, enforced. The router selects by newest-active; two active rows for one model would silently mis-price on the money path. Re-pricing is deactivate-then-insert, in that order. Per-ACCOUNT rate adjustments are NOT rates - they belong at the debit (see DOCS17), not in this table. Set by BUTCH ruling 2026-08-02.';