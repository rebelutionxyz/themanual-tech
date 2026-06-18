-- Four-axis architecture, "which" axis: per-atom band gating which surfaces an atom instantiates.
-- commons (structural, unclaimable, earns aggregate) | hub (communal, earns subcats' share)
-- | nova (claimable destination) | facet (content within a parent). NULL = unclassified.
-- Design walk 2026-06-09. Additive, nullable, no backfill (all 5,790 atoms start NULL).
ALTER TABLE public.atoms ADD COLUMN band text;

ALTER TABLE public.atoms ADD CONSTRAINT atoms_band_check CHECK (band IS NULL OR band IN ('commons','hub','nova','facet'));

COMMENT ON COLUMN public.atoms.band IS 'Four-axis classification (commons|hub|nova|facet) gating which surfaces an atom instantiates. NULL = unclassified. Design walk 2026-06-09.';
