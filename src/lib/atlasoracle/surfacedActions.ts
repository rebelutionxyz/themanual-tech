/* PER-ASTRA SURFACED ACTIONS — the quick directives h24 offers on the surface
 * you are standing on. MMF §12.3, "helpers in context".
 *
 * ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * `AtlasOracleWalletBadge` has taken a `surfacedActions` prop since May and
 * renders it as a row of one-tap directives. **No callsite has ever passed it**
 * (DOCS31 item 8), so the whole affordance has been dead code in production.
 * This file is the content, and `UtilityChrome` is the callsite.
 *
 * ─── KEYED BY ROUTE SEGMENT, NOT BY CATALOG SLUG ────────────────────────────
 * This is the detail that makes it work at all. `UtilityChrome` derives what it
 * calls `astraSlug` from the FIRST PATH SEGMENT — `pathname.split('/')[1]` — and
 * that is frequently NOT the catalog slug: `/intel` is the `forum` Astra,
 * `/unite` is `groups`, `/rule` is `events`, `/fund` is `crowdfunding`, `/brand`
 * is `brandosophic`, `/h24` is `atlasoracle`. Keying this map by catalog slug
 * would have looked correct in review and matched on almost nothing at runtime.
 *
 * So the lookup is BUILT FROM THE CATALOG'S OWN `route` FIELD: entries below are
 * written against catalog slugs (the stable identity), and `SURFACED_BY_SEGMENT`
 * derives the route-segment index from `ASTRA_CATALOG` at module load. Move a
 * route in the catalog and this follows it, with no second place to update.
 *
 * ─── WHAT IS DELIBERATELY ABSENT ────────────────────────────────────────────
 * Only Astras that are actually MOUNTED (`mount: 'page' | 'surface'`) carry
 * actions. A `stub` route renders a placeholder — offering "summarize what is in
 * view" on a page with nothing in view is a promise the surface cannot keep, and
 * it would spend a user's tokens to say so.
 *
 * `atlasoracle` itself carries none: you are already inside h24 there, and the
 * console at that route is the fuller surface.
 *
 * ─── LANGUAGE ──────────────────────────────────────────────────────────────
 * Three rules bind every string here, and the v0.1 draft this replaces broke all
 * three:
 *   1. USERS, NOT BEES (ORACLE_MF v1.27). The draft said "Bee" throughout.
 *   2. THE PLATFORM FIREWALL. The draft was full of `sell`, `trade`, `price`,
 *      `market`, `budget` — "Estimate fair price for the sell offer", "Summarize
 *      my trading week", "prediction markets". All banned. Approved vocabulary
 *      only: GET / GIVE / OFFER / EARN / RECEIVE / DONATE / SEND / ESCROW.
 *   3. NO BLiNG! DENOMINATION ON AN h24 SURFACE (Butch, 2026-07-27). h24 is
 *      denominated in Oracle Tokens. These strings avoid the word entirely, even
 *      on the ledger Astra, where "your balance" and "the ledger" say the same
 *      thing without putting a second currency on an h24 surface.
 *
 * ─── PROVENANCE ────────────────────────────────────────────────────────────
 * Rewritten by FRONT75 from `shared/canon/per-astra-surfaced-actions0.md` v0.1
 * (2026-05-20), which was stale in every dimension: Bee vocabulary, firewall
 * breaches, and 12 of its 20 Astras no longer exist under those names. What was
 * carried over, dropped, and added is recorded in the FRONT75 report.
 */

import type { SurfacedAction } from '@/components/AtlasOracleWalletBadge';
import { ASTRA_CATALOG } from '@/lib/astra-catalog';

/**
 * Catalog slug → its surfaced actions.
 *
 * Four to five per Astra. Fewer reads as an afterthought; more turns the badge
 * into a menu, and the directive box underneath is the general case anyway.
 */
export const SURFACED_ACTIONS: Record<string, SurfacedAction[]> = {
  /* ── Economy ─────────────────────────────────────────────────────────── */
  freedomblings: [
    {
      label: 'Explain my balance',
      directive:
        'Explain how my current balance was reached — what came in, what went out, and what is still held in escrow.',
      category: 'analyze',
    },
    {
      label: 'Summarize my week',
      directive:
        'Summarize my ledger activity this week: what I received, what I sent, and what is still open.',
      category: 'analyze',
    },
    {
      label: 'Read the curve',
      directive:
        'Explain where the bonding curve sits right now and what that means for what I can FREE today.',
      category: 'analyze',
    },
    {
      label: 'Check an escrow',
      directive:
        'Explain the escrow in view — who holds it, what releases it, and what happens if it is disputed.',
      category: 'analyze',
    },
  ],
  bazaar: [
    {
      label: 'Draft this listing',
      directive:
        'Draft a listing for what I am about to OFFER, from my rough notes, in HONEYCOMB voice.',
      category: 'draft',
    },
    {
      label: 'Find similar offers',
      directive:
        'Correlate the item in view against similar current offers and surface what is different about each.',
      category: 'correlate',
    },
    {
      label: 'Suggest what to ask',
      directive:
        'Suggest what to ask for this item, given comparable offers, and say plainly how confident that is.',
      category: 'estimate',
    },
    {
      label: 'Write the description',
      directive:
        'Rewrite the description in view so it answers what a reader would actually want to know first.',
      category: 'draft',
    },
  ],
  crowdfunding: [
    {
      label: 'Draft a campaign',
      directive:
        'Draft a campaign pitch from my project notes — what it is for, who it helps, and what the goal pays for.',
      category: 'draft',
    },
    {
      label: 'Sharpen this pitch',
      directive:
        'Analyze the campaign in view and suggest where the pitch is vague about what the money does.',
      category: 'analyze',
    },
    {
      label: 'Suggest reward tiers',
      directive: 'Suggest reward tiers for this campaign that a small team could actually deliver.',
      category: 'suggest',
    },
    {
      label: 'Find similar campaigns',
      directive:
        'Correlate this campaign against comparable ones and surface what the funded ones did differently.',
      category: 'correlate',
    },
  ],
  advertising: [
    {
      label: 'Draft promotion copy',
      directive:
        'Draft promotion copy for the campaign in view, in HONEYCOMB-aligned voice, in three variants.',
      category: 'draft',
    },
    {
      label: 'Estimate reach',
      directive:
        'Estimate reach for the targeting I have configured, and say what the estimate depends on.',
      category: 'estimate',
    },
    {
      label: 'Suggest placements',
      directive:
        'Suggest which Astra surfaces this promotion belongs on, given who is being reached.',
      category: 'suggest',
    },
    {
      label: 'Alternative angles',
      directive:
        'Generate alternative angles for this promotion so the same offer can be tried more than one way.',
      category: 'draft',
    },
  ],

  /* ── Knowledge ───────────────────────────────────────────────────────── */
  themanual: [
    {
      label: 'Explain this atom',
      directive:
        'Explain the atom in view in plain language, then say what the strongest case against it is.',
      category: 'analyze',
    },
    {
      label: 'Where does this belong?',
      directive:
        'Classify the atom in view against the 14 realms and suggest where in the taxonomy it belongs.',
      category: 'classify',
    },
    {
      label: 'Find related atoms',
      directive:
        'Correlate the atom in view against related atoms across realms and say how each connects.',
      category: 'correlate',
    },
    {
      label: 'What is missing?',
      directive:
        'Analyze the sources on this atom and name what kind of evidence would move it up the Discovery Ladder.',
      category: 'analyze',
    },
    {
      label: 'Draft an atom',
      directive:
        'Draft a new atom from my notes: a clear statement, a neutral summary, and the sources I have.',
      category: 'draft',
    },
  ],
  forum: [
    {
      label: 'Summarize this thread',
      directive:
        'Summarize the thread in view — the load-bearing claims, what was decided, and what is still open.',
      category: 'analyze',
    },
    {
      label: 'Steel-man the other side',
      directive:
        'State the strongest version of the position I disagree with in this thread, fairly.',
      category: 'analyze',
    },
    {
      label: 'Check these claims',
      directive:
        'Analyze the factual claims in the thread in view and flag which are sourced and which are asserted.',
      category: 'analyze',
    },
    {
      label: 'Draft a reply',
      directive:
        'Draft a reply to the post in view in my own voice — direct, and answering the actual point.',
      category: 'draft',
    },
  ],
  production: [
    {
      label: 'Break down this piece',
      directive:
        'Break the production in view into stages with what each one needs before it can start.',
      category: 'scaffold',
    },
    {
      label: 'Draft the outline',
      directive:
        'Draft a long-form outline from my notes, with the argument visible in the section headings.',
      category: 'draft',
    },
    {
      label: 'Tighten this draft',
      directive: 'Refactor the draft in view for length without losing any load-bearing claim.',
      category: 'refactor',
    },
    {
      label: 'What is unfinished?',
      directive:
        'Analyze this production and list what is still unresolved, in the order it blocks other work.',
      category: 'analyze',
    },
  ],

  /* ── Connection ──────────────────────────────────────────────────────── */
  groups: [
    {
      label: 'Suggest groups',
      directive: 'Suggest groups that match what I have been reading and posting lately.',
      category: 'suggest',
    },
    {
      label: 'Draft an intro',
      directive:
        'Draft an introduction post for me to share with a group I have just joined, in my voice.',
      category: 'draft',
    },
    {
      label: 'Catch me up',
      directive: 'Summarize what has happened in this group since I last looked.',
      category: 'analyze',
    },
    {
      label: 'Draft the group rules',
      directive: 'Draft house rules for the group in view that fit how it actually behaves.',
      category: 'draft',
    },
  ],
  events: [
    {
      label: 'Draft the listing',
      directive:
        'Draft an event description from my rough notes — what happens, for whom, and what to bring.',
      category: 'draft',
    },
    {
      label: 'Find related events',
      directive: 'Correlate the event in view against related ones by cause, place, or organizer.',
      category: 'correlate',
    },
    {
      label: 'Estimate turnout',
      directive:
        'Estimate likely turnout for this event given its kind, place, and comparable past events.',
      category: 'estimate',
    },
    {
      label: 'Plan the run of show',
      directive: 'Scaffold a run of show for this event, with timings and who owns each part.',
      category: 'scaffold',
    },
  ],
  comms: [
    {
      label: 'Summarize what I missed',
      directive:
        'Summarize the conversation in view — decisions made, questions left hanging, anything addressed to me.',
      category: 'analyze',
    },
    {
      label: 'Draft a reply',
      directive: 'Draft a reply to the message in view, matching the tone of the room.',
      category: 'draft',
    },
    {
      label: 'Say this more clearly',
      directive: 'Refactor what I have written so it says the same thing in fewer words.',
      category: 'refactor',
    },
    {
      label: 'Translate this',
      directive:
        'Translate the message in view into English and note anything that does not carry across.',
      category: 'translate',
    },
  ],
  pulse: [
    {
      label: 'What changed today?',
      directive: 'Summarize the most consequential activity across the Astras in the last day.',
      category: 'analyze',
    },
    {
      label: 'Explain this spike',
      directive: 'Analyze why the activity in view rose, and name what is driving it.',
      category: 'analyze',
    },
    {
      label: 'What am I missing?',
      directive:
        'Correlate recent platform activity against what I follow and surface what I have not seen.',
      category: 'correlate',
    },
  ],
  livevideo: [
    {
      label: 'Summarize this stream',
      directive: 'Summarize what has been covered in the stream in view so far.',
      category: 'analyze',
    },
    {
      label: 'Draft the description',
      directive: 'Draft a description and title for the stream I am about to start, from my notes.',
      category: 'draft',
    },
    {
      label: 'Pull the highlights',
      directive:
        'Analyze this session and pull out the moments worth clipping, with why each one stands.',
      category: 'analyze',
    },
  ],

  /* ── Do ──────────────────────────────────────────────────────────────── */
  miniwaves: [
    {
      label: 'Break this down',
      directive:
        'Break the task in view into a hierarchy with an honest time estimate at each level.',
      category: 'scaffold',
    },
    {
      label: 'Find the dependencies',
      directive:
        'Identify which of these sub-tasks must precede which, and where the chain is longest.',
      category: 'analyze',
    },
    {
      label: 'What should I drop?',
      directive:
        'Analyze my open items and suggest what to defer this week, given what is actually due.',
      category: 'analyze',
    },
    {
      label: 'Plan my day',
      directive:
        'Generate a plan for today from my open items, ordered by what is blocking the most.',
      category: 'suggest',
    },
  ],
  brandosophic: [
    {
      label: 'Draft brand voice',
      directive:
        'Draft a short voice guide for the brand in view — how it sounds, and how it never sounds.',
      category: 'draft',
    },
    {
      label: 'Name candidates',
      directive: 'Suggest name candidates for what I am building, with the reasoning for each.',
      category: 'suggest',
    },
    {
      label: 'Critique this identity',
      directive: 'Analyze the identity in view and say plainly where it is generic.',
      category: 'analyze',
    },
    {
      label: 'Check it against canon',
      directive:
        'Analyze this brand work against the HONEYCOMB naming conventions and flag anything off-pattern.',
      category: 'analyze',
    },
  ],

  /* ── Governance ──────────────────────────────────────────────────────── */
  voting: [
    {
      label: 'Explain this ballot',
      directive:
        'Explain what is actually being decided in the ballot in view, and what each option would mean.',
      category: 'analyze',
    },
    {
      label: 'Both cases, fairly',
      directive:
        'State the strongest case for and the strongest case against the proposal in view.',
      category: 'analyze',
    },
    {
      label: 'What happens if it passes?',
      directive:
        'Analyze what would change in practice if this proposal is enacted, and what would not.',
      category: 'analyze',
    },
    {
      label: 'Draft a proposal',
      directive:
        'Draft a proposal from my notes with clear wording and a resolution the result can be measured against.',
      category: 'draft',
    },
  ],
  legalservices: [
    {
      label: 'Plain-English this',
      directive:
        'Translate the document in view into plain English, with nothing important left out.',
      category: 'translate',
    },
    {
      label: 'Draft an intake note',
      directive:
        'Draft an intake note from my account of what happened, in plain English, no legalese.',
      category: 'draft',
    },
    {
      label: 'What should I ask?',
      directive:
        'Suggest the questions worth asking a lawyer about this matter. Advisory only — this is not legal advice.',
      category: 'suggest',
    },
    {
      label: 'Estimate complexity',
      directive:
        'Estimate how involved this matter is likely to be, and say what the estimate turns on.',
      category: 'estimate',
    },
  ],

  /* ── Security ────────────────────────────────────────────────────────── */
  dingleberry: [
    {
      label: 'Summarize my findings',
      directive:
        'Summarize the posture findings on my account — what is open, and which ones actually matter.',
      category: 'analyze',
    },
    {
      label: 'What do I fix first?',
      directive: 'Analyze my open security findings and order them by real risk, not by count.',
      category: 'analyze',
    },
    {
      label: 'Explain this finding',
      directive:
        'Explain the finding in view in plain language: what it means, and what an attacker would do with it.',
      category: 'analyze',
    },
    {
      label: 'Walk me through removal',
      directive: 'Walk me through the removal steps for what was detected, one step at a time.',
      category: 'suggest',
    },
  ],
};

/**
 * Route segment → actions, derived from the catalog at module load.
 *
 * `UtilityChrome` hands the badge the first path segment, so this index is what
 * the runtime actually queries. Built from `ASTRA_CATALOG`'s own `route` field
 * rather than hand-listed, so a route rename in the catalog carries here for
 * free. Aliases are deliberately NOT indexed: `route` is the canonical path per
 * ORACLE_MF v1.24, and an alias is documentation, not a second home.
 */
export const SURFACED_BY_SEGMENT: Record<string, SurfacedAction[]> = (() => {
  const index: Record<string, SurfacedAction[]> = {};
  for (const astra of ASTRA_CATALOG) {
    const actions = SURFACED_ACTIONS[astra.slug];
    if (!actions) continue;
    const segment = astra.route.split('/').filter(Boolean)[0];
    if (segment) index[segment] = actions;
  }
  return index;
})();

/**
 * Actions for the surface the user is standing on.
 *
 * Returns an empty array for anything unmapped, and the badge renders no action
 * row at all in that case — an Astra with nothing useful to offer shows nothing,
 * rather than a generic prompt that would spend tokens to say little.
 */
export function surfacedActionsFor(segment: string): SurfacedAction[] {
  return SURFACED_BY_SEGMENT[segment] ?? [];
}
