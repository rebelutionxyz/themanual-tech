-- DB47: complete the Justice public read surface for the live provider.
-- Pattern-copied from the deployed justice_*_public views: security_invoker=true,
-- curated columns (actor uuids dropped), is_fixture / review gating.
-- Rollback (exact): drop view if exists public.justice_claim_exhibits_public;
--                   drop view if exists public.justice_entities_public;

create view public.justice_entities_public
with (security_invoker = true) as
select e.id,
       e.slug,
       e.name,
       e.kind,
       e.realm,
       e.created_at,
       e.updated_at
  from public.justice_entities e
 where e.is_fixture = false;

comment on view public.justice_entities_public is
$c1$Public read surface for the entity registry. Gate: is_fixture=false, matching
justice_dockets_public. Drops is_fixture (it is the filter, not data). Added by DB47
so the live provider can resolve respondent names and the registry.$c1$;

create view public.justice_claim_exhibits_public
with (security_invoker = true) as
select ce.claim_id,
       ce.exhibit_id,
       ce.stance,
       ce.created_at
  from public.justice_claim_exhibits ce
  join public.justice_claims_public   cp on cp.id = ce.claim_id
  join public.justice_exhibits_public ep on ep.id = ce.exhibit_id;

comment on view public.justice_claim_exhibits_public is
$c2$Public claim-to-exhibit links. A link is visible only when BOTH sides are already
public: it composes justice_claims_public and justice_exhibits_public rather than
restating their gates, so the gating logic stays single-sourced. Drops linked_by
(actor), matching the pattern. Added by DB47.$c2$;

grant select on public.justice_entities_public       to anon, authenticated, service_role;
grant select on public.justice_claim_exhibits_public to anon, authenticated, service_role;