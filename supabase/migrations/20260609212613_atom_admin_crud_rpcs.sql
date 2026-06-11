-- Admin-gated, audited atom management. All check is_platform_admin() internally.
-- atom_create derives id/path/path_parts/depth/realm/kettle from parent + flips parent is_leaf.
CREATE OR REPLACE FUNCTION public.atom_create(p_parent_id text, p_name text, p_status text DEFAULT 'live', p_band text DEFAULT NULL, p_type text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_parent public.atoms; v_slug text; v_id text; v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'atom_create: platform admin only' USING ERRCODE='42501'; END IF;
  IF p_parent_id IS NULL THEN RAISE EXCEPTION 'atom_create: parent required (realm creation not supported here)'; END IF;
  SELECT * INTO v_parent FROM public.atoms WHERE id=p_parent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'atom_create: parent % not found', p_parent_id; END IF;
  IF p_name IS NULL OR length(btrim(p_name))=0 THEN RAISE EXCEPTION 'atom_create: name required'; END IF;
  IF p_status NOT IN ('live','draft','archived') THEN RAISE EXCEPTION 'atom_create: invalid status %', p_status; END IF;
  v_slug := btrim(regexp_replace(lower(p_name),'[^a-z0-9]+','-','g'),'-');
  IF v_slug='' THEN RAISE EXCEPTION 'atom_create: name % yields empty slug', p_name; END IF;
  v_id := v_parent.id || '-' || v_slug;
  IF EXISTS (SELECT 1 FROM public.atoms WHERE id=v_id) THEN RAISE EXCEPTION 'atom_create: % already exists', v_id; END IF;
  INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,status,band)
  VALUES (v_id,p_name,v_parent.path||' / '||p_name,v_parent.path_parts||p_name,v_parent.realm_id,v_parent.realm_name,v_parent.depth+1,COALESCE(p_type,v_parent.type),v_parent.kettle,true,p_status,p_band);
  IF v_parent.is_leaf THEN UPDATE public.atoms SET is_leaf=false, updated_at=now() WHERE id=v_parent.id; END IF;
  INSERT INTO public.atom_audit (atom_id,actor_bee_id,action,after) VALUES (v_id,v_actor,'create',(SELECT to_jsonb(a) FROM public.atoms a WHERE a.id=v_id));
  RETURN v_id;
END; $fn$;

CREATE OR REPLACE FUNCTION public.atom_update(p_id text, p_band text DEFAULT NULL, p_skin_tags text[] DEFAULT NULL, p_note text DEFAULT NULL, p_type text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_before jsonb; v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'atom_update: platform admin only' USING ERRCODE='42501'; END IF;
  SELECT to_jsonb(a) INTO v_before FROM public.atoms a WHERE a.id=p_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'atom_update: atom % not found', p_id; END IF;
  UPDATE public.atoms SET band=COALESCE(p_band,band), skin_tags=COALESCE(p_skin_tags,skin_tags), note=COALESCE(p_note,note), type=COALESCE(p_type,type), updated_at=now() WHERE id=p_id;
  INSERT INTO public.atom_audit (atom_id,actor_bee_id,action,before,after) VALUES (p_id,v_actor,'update',v_before,(SELECT to_jsonb(a) FROM public.atoms a WHERE a.id=p_id));
END; $fn$;

CREATE OR REPLACE FUNCTION public.atom_set_status(p_id text, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_before jsonb; v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'atom_set_status: platform admin only' USING ERRCODE='42501'; END IF;
  IF p_status NOT IN ('live','draft','archived') THEN RAISE EXCEPTION 'atom_set_status: invalid status %', p_status; END IF;
  SELECT to_jsonb(a) INTO v_before FROM public.atoms a WHERE a.id=p_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'atom_set_status: atom % not found', p_id; END IF;
  UPDATE public.atoms SET status=p_status, updated_at=now() WHERE id=p_id;
  INSERT INTO public.atom_audit (atom_id,actor_bee_id,action,before,after) VALUES (p_id,v_actor,'set_status:'||p_status,v_before,(SELECT to_jsonb(a) FROM public.atoms a WHERE a.id=p_id));
END; $fn$;

GRANT EXECUTE ON FUNCTION public.atom_create(text,text,text,text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.atom_update(text,text,text[],text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.atom_set_status(text,text) TO authenticated;
