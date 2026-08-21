/* ============================================================
   DEPTH SHARED MECHANICS — barrel.

   DEPTH_MECH1 (DEPTH_SLATE v1 E3). Four object-agnostic primitives on one money
   seam, consumed by Bazaar / News / Ads / Events / Games. Every mechanic settles
   through `rails.ts` (propose-first) so all of them feed the SAME DEPTH BLiNG rail
   when DEPTH_RAILS1 mounts it — never a private settlement path.

     rails      — the money seam: SettlementProposal shape + the RailMount stub
     rng        — deterministic, auditable draw RNG (used by raffle)
     auction    — ascending (English) auction: bid / close / settle
     raffle     — ticketed deterministic draw
     ticketing  — tiered issuance with caps + QR-ready tokens
     stream     — live-session lifecycle + presence + tips

   Coordination note for the rail: docs/depth-mechanics-rails-mount.md.
   ============================================================ */

export * from './rails';
export * from './rng';
export * from './auction';
export * from './raffle';
export * from './ticketing';
export * from './stream';
