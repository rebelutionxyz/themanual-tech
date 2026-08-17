comment on function public.justice_is_admin() is $c1$Justice admin gate. Reads public.bees.is_admin for the calling auth.uid().
Returns false for anon. Every justice_* write policy and RPC routes through
this one predicate.$c1$;

comment on table public.justice_settings is $c2$Singleton (id is always true). Holds the write posture for Justice v1:
create_requires_admin=true means no non-admin path creates dockets. spawn_max_depth
is a sanity ceiling on holarchy depth, not a modelling claim.$c2$;

comment on column public.ops_dispatches.workdir is $c3$Folder the work lives in (e.g. honeycomb-workspace/Justice). A terminal
claiming a dispatch whose workdir differs from its own folder releases the claim
and tells the human where to open it.$c3$;