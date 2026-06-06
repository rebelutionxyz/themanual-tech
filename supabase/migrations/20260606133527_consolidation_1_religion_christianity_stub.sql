-- =====================================================================
-- Migration 20260606133527 — consolidation_1_religion_christianity_stub
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Verbatim body (DELETE migration — touches existing data). Adds the
-- Christianity/Denominations node and removes the duplicate pre-Abrahamic
-- 'Religion / Major religions / Christianity' stub branch (2 nodes).
-- Idempotent on replay: INSERT migrations recreate the rows first, then this
-- removes the stubs → net end-state matches prod.
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT 'religion-major-religions-abrahamic-religions-christianity-denominations',
       'Denominations',
       'Religion / Major religions / Abrahamic religions / Christianity / Denominations',
       string_to_array('Religion / Major religions / Abrahamic religions / Christianity / Denominations',' / '),
       'religion','Religion',
       array_length(string_to_array('Religion / Major religions / Abrahamic religions / Christianity / Denominations',' / '),1),
       'event', false, 'Accepted'
WHERE NOT EXISTS (SELECT 1 FROM public.atoms WHERE id='religion-major-religions-abrahamic-religions-christianity-denominations');

DELETE FROM public.atoms
WHERE id IN ('religion-major-religions-christianity-denominations',
             'religion-major-religions-christianity');
