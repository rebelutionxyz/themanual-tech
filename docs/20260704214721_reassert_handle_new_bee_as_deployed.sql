-- Re-assert public.handle_new_bee() exactly as deployed in prod.
-- Context: 20260512090000_ratify_handle_new_bee_function.sql in the repo is a
-- verification script (checks search_path proconfig) and never captured the
-- function body. The body lived only on stranded feature branches + prod.
-- This migration closes that record gap (2026-07-04 reconciliation, flag 9).
-- Functionally a no-op: body below is verbatim pg_get_functiondef from prod.

CREATE OR REPLACE FUNCTION public.handle_new_bee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.bees (id, handle, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'handle', ''),
      'bee_' || substr(new.id::text, 1, 8)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
