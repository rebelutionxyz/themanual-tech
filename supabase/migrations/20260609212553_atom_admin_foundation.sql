-- Admin control foundation for atoms: gate + status + status-aware visibility + audit log.
-- No delete anywhere (Butch ratified status-control only; 'archived' is the reversible "delete").
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.bees WHERE id = auth.uid() AND is_admin = true);
$fn$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, anon;

ALTER TABLE public.atoms ADD COLUMN status text NOT NULL DEFAULT 'live';

ALTER TABLE public.atoms ADD CONSTRAINT atoms_status_check CHECK (status IN ('live','draft','archived'));

COMMENT ON COLUMN public.atoms.status IS 'Admin status control: live (public) | draft (admin-only, staged) | archived (admin-only, reversible retire). Replaces delete. 2026-06-09.';

DROP POLICY atoms_read_all ON public.atoms;

CREATE POLICY atoms_read_visible ON public.atoms FOR SELECT USING (status='live' OR public.is_platform_admin());

CREATE TABLE public.atom_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  atom_id text NOT NULL,
  actor_bee_id uuid,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atom_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY atom_audit_admin_read ON public.atom_audit FOR SELECT USING (public.is_platform_admin());

CREATE INDEX atom_audit_atom_idx ON public.atom_audit (atom_id);

COMMENT ON TABLE public.atom_audit IS 'Immutable trail of admin atom mutations (create/update/set_status). Written only by SECURITY DEFINER atom_* RPCs; admin-read. 2026-06-09.';
