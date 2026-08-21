-- =====================================================================
-- VOTE_SCHEMA_APPLY1 — controlled apply of VOTE_SCHEMA1 (proposal 0002).
-- Paired into the app tree per SQL_AUTONOMY v1.1 + LEAD_PROTOCOL v0.38.
-- Source proposal: REBELUTION.vote/db/proposed/0002_election_knowledge_graph.sql
-- ROLLBACK: REBELUTION.vote/db/proposed/0002_election_knowledge_graph.rollback.sql
--   (drops the 15 new tables in reverse order, then the 22 additive columns).
--
-- STRICTLY ADDITIVE: 15 new tables + 2 nullable ADD-COLUMN extensions on
-- election_bills / election_actors. Zero drop/alter-type/rename of existing
-- objects. Idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DO-block
-- policies guarded by object existence). RLS on all 15 new tables.
-- =====================================================================


-- =====================================================================
-- SECTION B. REFERENCE TABLES (vocabulary + source registry + citations)
-- =====================================================================

-- B1. SOURCE REGISTRY -------------------------------------------------
create table if not exists public.election_sources (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  kind        text not null check (kind in ('api','bulk','scrape','partner')),
  base_url    text,
  tier        text,
  auth        text,
  rate_limit  text,                          -- best-known; VERIFY at ingest (read off row)
  license     text,
  priority    int  not null default 100,     -- lower = higher authority (taxonomy s3f)
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- B2. CONTROLLED VOCABULARY ------------------------------------------
create table if not exists public.election_categories (
  id          uuid primary key default gen_random_uuid(),
  domain      text not null check (domain in (
                'policy_area','office_type','gov_level','gov_branch',
                'measure_type','election_type','actor_type','issue_tag','bill_status')),
  slug        text not null,
  label       text not null,
  code        text,                          -- source-native code (exact CRS term, source status)
  parent_id   uuid references public.election_categories(id),
  source_id   uuid references public.election_sources(id),
  sort        int  not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (domain, slug)
);

-- B3. PER-FIELD CITATION (Tier 2 provenance) --------------------------
create table if not exists public.election_field_citations (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null check (entity in ('bill','race','candidate','poll','event','rollcall')),
  entity_id   text not null,                 -- text: bills/actors are text PKs; uuids stored as text
  field       text not null,
  source_id   uuid not null references public.election_sources(id),
  source_url  text not null,
  retrieved_at timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists election_field_citations_entity_idx
  on public.election_field_citations (entity, entity_id);


-- =====================================================================
-- SECTION C. EXTEND EXISTING TABLES (additive, nullable, non-breaking)
-- =====================================================================

-- C1. election_bills -> carry the sourced federal/state bill fields
alter table public.election_bills
  add column if not exists level           text,                                   -- 'federal'|'state'
  add column if not exists congress        int,                                    -- federal congress number
  add column if not exists session         text,                                   -- state session id
  add column if not exists chamber         text,                                   -- 'house'|'senate'
  add column if not exists bill_number     text,                                   -- 'HR 1234' / 'S 5'
  add column if not exists summary         text,
  add column if not exists introduced_date date,
  add column if not exists policy_area_id  uuid references public.election_categories(id),  -- ONE CRS policy area
  add column if not exists status_id       uuid references public.election_categories(id),  -- normalized bill_status
  add column if not exists source_id       uuid references public.election_sources(id),
  add column if not exists source_url       text,
  add column if not exists retrieved_at    timestamptz;
-- NOTE: existing `sponsors text[]` and `stage int` (ballot ladder) are LEFT AS-IS.
--       Structured sponsorship lives in election_bill_sponsors (C-complement below).

-- C2. election_actors -> carry candidate/actor profile + finance + provenance
alter table public.election_actors
  add column if not exists actor_type_id    uuid references public.election_categories(id),
  add column if not exists party            text,
  add column if not exists origin           text,                                  -- state/district/city "where from"
  add column if not exists current_office   text,
  add column if not exists prior_offices    jsonb not null default '[]'::jsonb,
  add column if not exists fec_committee_id text,
  add column if not exists campaign_finance jsonb,                                 -- {totals..}, cite FEC via field_citations
  add column if not exists source_id        uuid references public.election_sources(id),
  add column if not exists source_url        text,
  add column if not exists retrieved_at     timestamptz;
-- NOTE: existing `standing` column is DELIBERATELY NOT USED (contract.ts 6.6.4
--       anti-stored-reputation lock). This proposal writes no value to it.


-- =====================================================================
-- SECTION D. NEW ENTITY + RELATIONSHIP TABLES
-- =====================================================================

-- D1. bill <-> issue_tag (many-to-many; policy_area is the one-per-bill column)
create table if not exists public.election_bill_categories (
  bill_id     text not null references public.election_bills(id) on delete cascade,
  category_id uuid not null references public.election_categories(id),
  primary key (bill_id, category_id)
);

-- D2. structured sponsorship (bill <-> actor), sourced
create table if not exists public.election_bill_sponsors (
  id          uuid primary key default gen_random_uuid(),
  bill_id     text not null references public.election_bills(id) on delete cascade,
  actor_id    text not null references public.election_actors(id),
  role        text not null check (role in ('sponsor','cosponsor')),
  ordinal     int  not null default 0,               -- cosponsor order
  cosponsored_date date,
  source_id   uuid references public.election_sources(id),
  source_url  text,
  retrieved_at timestamptz,
  unique (bill_id, actor_id, role)
);
create index if not exists election_bill_sponsors_bill_idx  on public.election_bill_sponsors (bill_id);
create index if not exists election_bill_sponsors_actor_idx on public.election_bill_sponsors (actor_id);

-- D3. committees + bill<->committee referral
create table if not exists public.election_committees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  chamber     text,                                   -- 'house'|'senate'|'joint'|state
  level       text,                                   -- 'federal'|'state'
  jurisdiction text,
  source_id   uuid references public.election_sources(id),
  source_url  text,
  retrieved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (name, chamber, jurisdiction)
);
create table if not exists public.election_bill_committees (
  bill_id      text not null references public.election_bills(id) on delete cascade,
  committee_id uuid not null references public.election_committees(id),
  referred_date date,
  primary key (bill_id, committee_id)
);

-- D4. bill ACTION TIMELINE (dated events)
create table if not exists public.election_bill_actions (
  id          uuid primary key default gen_random_uuid(),
  bill_id     text not null references public.election_bills(id) on delete cascade,
  action_date date not null,
  chamber     text,
  action_text text not null,                          -- source-quoted, neutral
  status_id   uuid references public.election_categories(id),  -- optional stage this action moved to
  sort        int  not null default 0,
  source_id   uuid references public.election_sources(id),
  source_url  text,
  retrieved_at timestamptz
);
create index if not exists election_bill_actions_bill_idx on public.election_bill_actions (bill_id, action_date);

-- D5. ROLL-CALL votes: the vote EVENT, then per-actor votes
create table if not exists public.election_rollcalls (
  id          uuid primary key default gen_random_uuid(),
  bill_id     text references public.election_bills(id) on delete cascade,
  chamber     text not null,
  vote_date   date not null,
  question    text not null,                          -- "On Passage" etc, source-quoted
  result      text,                                   -- "Passed"/"Failed", source
  yea         int,
  nay         int,
  present     int,
  not_voting  int,
  source_id   uuid references public.election_sources(id),
  source_url  text,
  retrieved_at timestamptz
);
create table if not exists public.election_rollcall_votes (
  rollcall_id uuid not null references public.election_rollcalls(id) on delete cascade,
  actor_id    text not null references public.election_actors(id),
  vote        text not null check (vote in ('yea','nay','present','not_voting')),
  primary key (rollcall_id, actor_id)
);

-- D6. sourced RACES / ELECTIONS (distinct from the `elections` ballot table)
create table if not exists public.election_races (
  id             uuid primary key default gen_random_uuid(),
  office_type_id uuid references public.election_categories(id),
  level_id       uuid references public.election_categories(id),
  branch_id      uuid references public.election_categories(id),
  jurisdiction   text not null,                       -- "US" | "CO" | "Denver, CO Dist. 3"
  election_type_id uuid references public.election_categories(id),
  election_date  date,
  incumbent_actor_id text references public.election_actors(id),
  measure_type_id uuid references public.election_categories(id),  -- ballot measures only
  turnout        bigint,                              -- NULL = unknown, render "-"
  results        jsonb,                               -- PAST races only; SoS certified
  source_id      uuid references public.election_sources(id),
  source_url     text,
  retrieved_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists election_races_date_idx on public.election_races (election_date);

-- D7. race <-> candidate (many-to-many)
create table if not exists public.election_race_candidates (
  race_id     uuid not null references public.election_races(id) on delete cascade,
  actor_id    text not null references public.election_actors(id),
  is_incumbent boolean not null default false,
  party       text,
  ballot_order int,
  result      text,                                   -- 'won'|'lost'|'runoff'|..., PAST only, sourced
  vote_total  bigint,
  source_url  text,
  primary key (race_id, actor_id)
);

-- D8. POLLS (labeled ESTIMATES; pollster + date required) + per-candidate results
create table if not exists public.election_polls (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid references public.election_races(id) on delete cascade,
  pollster      text not null,                        -- ORIGINAL pollster, never the aggregator
  conducted_start date,
  conducted_end date not null,
  sample_size   int,
  population    text,                                 -- 'LV'|'RV'|'A'
  method        text,                                 -- phone/online/mixed
  margin_of_error numeric,
  aggregator    text,                                 -- provenance if found via 538/RCP
  source_id     uuid references public.election_sources(id),
  source_url    text not null,                        -- polls MUST cite
  retrieved_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists election_polls_race_idx on public.election_polls (race_id, conducted_end);
create table if not exists public.election_poll_results (
  poll_id     uuid not null references public.election_polls(id) on delete cascade,
  actor_id    text references public.election_actors(id),
  candidate_label text not null,                      -- label kept even when no actor row yet
  pct         numeric not null,
  primary key (poll_id, candidate_label)
);

-- D9. ENDORSEMENTS (structured + sourced; complements generic election_connections)
create table if not exists public.election_endorsements (
  id            uuid primary key default gen_random_uuid(),
  endorser_actor_id text not null references public.election_actors(id),
  target_kind   text not null check (target_kind in ('candidate','race','bill')),
  target_id     text not null,                        -- actor_id / race_id::text / bill_id
  stance        text,                                 -- 'support'|'oppose'|null (fact-only when absent)
  endorsed_date date,
  source_id     uuid references public.election_sources(id),
  source_url    text,
  retrieved_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists election_endorsements_target_idx on public.election_endorsements (target_kind, target_id);


-- =====================================================================
-- SECTION E. RLS + GRANTS (mirror the established election_* convention:
--   <table>_public_read SELECT to anon,authenticated USING(true);
--   admin insert/update via is_platform_admin(); ingest runs service-role.)
-- Guarded so a re-run does not error on an existing policy.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'election_sources','election_categories','election_field_citations',
    'election_bill_categories','election_bill_sponsors','election_committees',
    'election_bill_committees','election_bill_actions','election_rollcalls',
    'election_rollcall_votes','election_races','election_race_candidates',
    'election_polls','election_poll_results','election_endorsements'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_public_read') then
      execute format($p$create policy %I on public.%I for select to anon, authenticated using (true);$p$,
                     t||'_public_read', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_admin_insert') then
      execute format($p$create policy %I on public.%I for insert to authenticated with check (is_platform_admin());$p$,
                     t||'_admin_insert', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_admin_update') then
      execute format($p$create policy %I on public.%I for update to authenticated using (is_platform_admin());$p$,
                     t||'_admin_update', t);
    end if;
  end loop;
end $$;
-- Bulk ingest writes as service-role (bypasses RLS). No anon/authenticated
-- write path beyond the admin curation policies above.


-- =====================================================================
-- SECTION F. SEEDS - the taxonomy vocabulary (identical content to
-- VOTE_TAXONOMY v1; election_* namespace). All ON CONFLICT DO NOTHING.
-- =====================================================================

-- F1. policy_area: 32 CRS terms (SPINE). code = exact congress.gov policyArea.name
insert into public.election_categories (domain, slug, label, code, sort) values
 ('policy_area','agriculture_food','Agriculture and Food','Agriculture and Food',1),
 ('policy_area','animals','Animals','Animals',2),
 ('policy_area','armed_forces_national_security','Armed Forces and National Security','Armed Forces and National Security',3),
 ('policy_area','arts_culture_religion','Arts, Culture, Religion','Arts, Culture, Religion',4),
 ('policy_area','civil_rights_minority_issues','Civil Rights and Liberties, Minority Issues','Civil Rights and Liberties, Minority Issues',5),
 ('policy_area','commerce','Commerce','Commerce',6),
 ('policy_area','congress','Congress','Congress',7),
 ('policy_area','crime_law_enforcement','Crime and Law Enforcement','Crime and Law Enforcement',8),
 ('policy_area','economics_public_finance','Economics and Public Finance','Economics and Public Finance',9),
 ('policy_area','education','Education','Education',10),
 ('policy_area','emergency_management','Emergency Management','Emergency Management',11),
 ('policy_area','energy','Energy','Energy',12),
 ('policy_area','environmental_protection','Environmental Protection','Environmental Protection',13),
 ('policy_area','families','Families','Families',14),
 ('policy_area','finance_financial_sector','Finance and Financial Sector','Finance and Financial Sector',15),
 ('policy_area','foreign_trade_intl_finance','Foreign Trade and International Finance','Foreign Trade and International Finance',16),
 ('policy_area','government_operations_politics','Government Operations and Politics','Government Operations and Politics',17),
 ('policy_area','health','Health','Health',18),
 ('policy_area','housing_community_development','Housing and Community Development','Housing and Community Development',19),
 ('policy_area','immigration','Immigration','Immigration',20),
 ('policy_area','international_affairs','International Affairs','International Affairs',21),
 ('policy_area','labor_employment','Labor and Employment','Labor and Employment',22),
 ('policy_area','law','Law','Law',23),
 ('policy_area','native_americans','Native Americans','Native Americans',24),
 ('policy_area','public_lands_natural_resources','Public Lands and Natural Resources','Public Lands and Natural Resources',25),
 ('policy_area','science_tech_communications','Science, Technology, Communications','Science, Technology, Communications',26),
 ('policy_area','social_sciences_history','Social Sciences and History','Social Sciences and History',27),
 ('policy_area','social_welfare','Social Welfare','Social Welfare',28),
 ('policy_area','sports_recreation','Sports and Recreation','Sports and Recreation',29),
 ('policy_area','taxation','Taxation','Taxation',30),
 ('policy_area','transportation_public_works','Transportation and Public Works','Transportation and Public Works',31),
 ('policy_area','water_resources_development','Water Resources Development','Water Resources Development',32)
on conflict (domain, slug) do nothing;

-- F2. gov_level + gov_branch
insert into public.election_categories (domain, slug, label, sort) values
 ('gov_level','federal','Federal',1),('gov_level','state','State',2),('gov_level','local','Local',3),
 ('gov_branch','executive','Executive',1),('gov_branch','legislative','Legislative',2),('gov_branch','judicial','Judicial',3)
on conflict (domain, slug) do nothing;

-- F3. office_type
insert into public.election_categories (domain, slug, label, sort) values
 ('office_type','us_senate','U.S. Senate',1),('office_type','us_house','U.S. House',2),
 ('office_type','president','President',3),('office_type','vice_president','Vice President',4),
 ('office_type','state_senate','State Senate',10),('office_type','state_house','State House / Assembly',11),
 ('office_type','governor','Governor',12),('office_type','lt_governor','Lieutenant Governor',13),
 ('office_type','attorney_general','Attorney General',14),('office_type','secretary_of_state','Secretary of State',15),
 ('office_type','state_treasurer','State Treasurer',16),('office_type','state_auditor','State Auditor',17),
 ('office_type','state_superintendent','State Superintendent',18),('office_type','state_exec_other','State Executive (other)',19),
 ('office_type','state_supreme_court','State Supreme Court',20),('office_type','state_appellate','State Appellate Court',21),
 ('office_type','state_trial_court','State Trial Court',22),('office_type','mayor','Mayor',30),
 ('office_type','city_council','City Council',31),('office_type','county_commission','County Commission',32),
 ('office_type','school_board','School Board',33),('office_type','district_attorney','District Attorney',34),
 ('office_type','sheriff','Sheriff',35),('office_type','local_judicial','Local Judicial',36),
 ('office_type','special_district','Special District',37),('office_type','local_other','Local (other)',38)
on conflict (domain, slug) do nothing;

-- F4. measure_type
insert into public.election_categories (domain, slug, label, sort) values
 ('measure_type','initiative','Ballot Initiative',1),('measure_type','referendum','Referendum',2),
 ('measure_type','legislative_referral','Legislative Referral',3),('measure_type','constitutional_amendment','Constitutional Amendment',4),
 ('measure_type','bond','Bond Measure',5),('measure_type','recall','Recall',6)
on conflict (domain, slug) do nothing;

-- F5. election_type
insert into public.election_categories (domain, slug, label, sort) values
 ('election_type','primary','Primary',1),('election_type','general','General',2),('election_type','special','Special',3),
 ('election_type','runoff','Runoff',4),('election_type','primary_runoff','Primary Runoff',5),
 ('election_type','top_two_primary','Top-Two Primary',6),('election_type','jungle_primary','Jungle Primary',7),
 ('election_type','caucus','Caucus',8),('election_type','recall_election','Recall Election',9)
on conflict (domain, slug) do nothing;

-- F6. actor_type
insert into public.election_categories (domain, slug, label, sort) values
 ('actor_type','person_candidate','Candidate / Officeholder',1),('actor_type','incumbent','Incumbent (flag)',2),
 ('actor_type','org_endorser','Endorsing Organization',3),('actor_type','org_pac','Political Committee (PAC)',4),
 ('actor_type','org_party','Political Party',5),('actor_type','company','Company',6),
 ('actor_type','government_body','Government Body',7)
on conflict (domain, slug) do nothing;

-- F7. bill_status (normalized ladder; code holds source-native string at ingest)
insert into public.election_categories (domain, slug, label, sort) values
 ('bill_status','introduced','Introduced',1),('bill_status','in_committee','In Committee',2),
 ('bill_status','reported','Reported',3),('bill_status','passed_chamber','Passed Chamber',4),
 ('bill_status','passed_both','Passed Both Chambers',5),('bill_status','to_executive','To Executive',6),
 ('bill_status','enacted','Enacted',7),('bill_status','vetoed','Vetoed',8),
 ('bill_status','failed','Failed',9),('bill_status','withdrawn','Withdrawn',10),('bill_status','died','Died',11)
on conflict (domain, slug) do nothing;

-- F8. issue_tag (curated starter set; extend only via a taxonomy pass)
insert into public.election_categories (domain, slug, label, sort) values
 ('issue_tag','veterans','Veterans',1),('issue_tag','mental_health','Mental Health',2),
 ('issue_tag','reproductive_rights','Reproductive Rights',3),('issue_tag','gun_policy','Gun Policy',4),
 ('issue_tag','climate','Climate',5),('issue_tag','elections_voting','Elections & Voting',6),
 ('issue_tag','student_debt','Student Debt',7),('issue_tag','medicare_medicaid','Medicare / Medicaid',8),
 ('issue_tag','border_security','Border Security',9),('issue_tag','ai_regulation','AI Regulation',10),
 ('issue_tag','data_privacy','Data Privacy',11),('issue_tag','criminal_justice_reform','Criminal Justice Reform',12),
 ('issue_tag','housing_affordability','Housing Affordability',13),('issue_tag','minimum_wage','Minimum Wage',14),
 ('issue_tag','trade_tariffs','Trade & Tariffs',15),('issue_tag','crypto_digital_assets','Crypto & Digital Assets',16),
 ('issue_tag','broadband','Broadband',17),('issue_tag','water_rights','Water Rights',18),
 ('issue_tag','public_lands_access','Public Lands Access',19),('issue_tag','election_security','Election Security',20)
on conflict (domain, slug) do nothing;

-- F9. sources (rate_limit best-known 2026-08-20; VERIFY at ingest)
insert into public.election_sources (slug, name, kind, base_url, tier, auth, rate_limit, license, priority, notes) values
 ('congress_gov','Congress.gov API','api','https://api.congress.gov/v3','federal_leg','api.data.gov key','~5000/hr/key','public domain',10,'PRIMARY federal bills; policyArea already stamped'),
 ('govinfo','GovInfo API','api','https://api.govinfo.gov','federal_leg','api.data.gov key','api.data.gov default','public domain',10,'Full bill text / PDFs'),
 ('govtrack','GovTrack (bulk)','bulk','https://www.govtrack.us/data','federal_leg','none','bulk files - be polite','CC-BY',30,'Backfill/secondary only'),
 ('openstates','OpenStates API v3','api','https://v3.openstates.org','state_leg','openstates key','tiered - throttle+daily cap','CC-BY-SA',20,'PRIMARY state bills; subject->policy_area crosswalk in Phase 2'),
 ('openstates_bulk','OpenStates bulk','bulk','https://openstates.org/data','state_leg','none','download','CC-BY-SA',20,'Big backfill'),
 ('openfec','OpenFEC','api','https://api.open.fec.gov/v1','fec','api.data.gov key','~1000/hr default (raiseable)','public domain',10,'Campaign finance'),
 ('fec_bulk','FEC bulk','bulk','https://www.fec.gov/data','fec','none','download','public domain',10,null),
 ('ballotpedia','Ballotpedia','partner','https://ballotpedia.org','elections','partner/licensed','per agreement','restricted',40,'RESTRICTED - partnership preferred, respect ToS'),
 ('votesmart','VoteSmart','api','https://api.votesmart.org','elections','key','per key','restricted',40,'Confirm non-commercial terms'),
 ('sos_generic','State Secretary of State','scrape','','elections','varies','varies','public record',15,'Authoritative for certified results + filings; per-state rows sos_<st>'),
 ('fivethirtyeight','FiveThirtyEight archive','bulk','https://github.com/fivethirtyeight/data','polls','none','download','CC-BY',50,'Polls DISCOVERY only; de-reference to original pollster; archival'),
 ('rcp','RealClearPolitics','scrape','https://www.realclearpolitics.com','polls','none','scrape-discouraged','restricted',50,'Polls discovery only; respect ToS; cite original pollster')
on conflict (slug) do nothing;

-- END. Rollback: 0002_election_knowledge_graph.rollback.sql
