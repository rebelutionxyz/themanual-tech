-- Four-axis architecture, "where" axis: the surface-instance spine.
-- One row = one Astra projected onto one atom (e.g. Superman Events = AtlasUNITED x superman atom).
-- Singular per (atom,astra) hub; intra-surface multiplicity (many Novas under the Groups hub)
-- lives in that surface's own tables (manual_groups via manual_group_atoms). Lazily instantiated.
-- Generalizes manual_group_atoms across the whole constellation. Design walk 2026-06-09.
CREATE TABLE public.atom_surfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id text NOT NULL REFERENCES public.atoms(id) ON DELETE CASCADE,
  astra_id uuid NOT NULL REFERENCES public.astra_registry(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','dormant','archived')),
  instantiated_by uuid REFERENCES public.bees(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT atom_surfaces_atom_astra_uniq UNIQUE (atom_id, astra_id)
);

COMMENT ON TABLE public.atom_surfaces IS 'Surface-instance spine (four-axis arch, "where"): one row = one Astra projected onto one atom. Singular per (atom,astra) hub; intra-surface multiplicity lives in that surface''s own tables. Lazily instantiated. Generalizes manual_group_atoms. Design walk 2026-06-09.';

CREATE INDEX atom_surfaces_astra_idx ON public.atom_surfaces (astra_id);

CREATE INDEX atom_surfaces_atom_idx ON public.atom_surfaces (atom_id);

ALTER TABLE public.atom_surfaces ENABLE ROW LEVEL SECURITY;

-- Surface existence is public knowledge (anyone can see Superman has an Events page); writes are service-role only (service_role bypasses RLS).
CREATE POLICY atom_surfaces_public_read ON public.atom_surfaces FOR SELECT USING (true);
