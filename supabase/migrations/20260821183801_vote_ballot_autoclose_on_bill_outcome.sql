-- =====================================================================
-- VOTE_BALLOTS_CLOSE_APPLY1 (migrate lane) — paired apply of the auto-close-
-- on-bill-outcome mechanism proposed by VOTE_BALLOTS_FED1 (VOTE_BALLOTS v1).
-- Source proposal: REBELUTION.vote/db/proposed/0004_ballot_autoclose_on_bill_outcome.sql
-- Rollback:        REBELUTION.vote/db/proposed/0004_ballot_autoclose_on_bill_outcome.rollback.sql
--                  (also stated in the ASTRA/REPORT pre-flight for this pass).
--
-- A legislation ballot auto-closes (open -> 'decided') when its linked bill
-- reaches a TERMINAL legislative status (enacted|failed|vetoed|withdrawn|died).
-- Outcome-driven, NOT time-based expiry. Mirrors public.elections_close_expired's
-- open->decided semantics; certification stays a separate admin step.
--
-- AFTER UPDATE OF status_id — does NOT retroactively close already-terminal bills;
-- an existing open ballot closes only on the bill's NEXT status change.
-- =====================================================================

create or replace function public.elections_autoclose_on_bill_outcome()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_slug  text;
  v_label text;
begin
  if new.status_id is null then
    return new;
  end if;

  select slug, label into v_slug, v_label
    from public.election_categories
   where id = new.status_id and domain = 'bill_status';

  if v_slug is null or v_slug not in ('enacted','failed','vetoed','withdrawn','died') then
    return new;
  end if;

  update public.elections e
     set status      = 'decided',
         closes_at   = greatest(e.opens_at + interval '1 second', least(e.closes_at, now())),
         closes_note = 'Closed on bill outcome: ' || v_label || ' (' || now()::date || ').',
         updated_at  = now()
   where e.status = 'open'
     and ( e.bill_ref = new.id
           or exists ( select 1 from public.election_connections c
                        where c.election_id = e.id
                          and c.kind = 'bill'
                          and c.target_id = new.id ) );

  return new;
end;
$fn$;

drop trigger if exists trg_election_bill_outcome_autoclose on public.election_bills;
create trigger trg_election_bill_outcome_autoclose
  after update of status_id on public.election_bills
  for each row
  when (new.status_id is distinct from old.status_id)
  execute function public.elections_autoclose_on_bill_outcome();
