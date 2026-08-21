# PATCHBOARD NODE CENSUS (PATCHBOARD2)

The list the owner has never had: every tunable in the HONEYCOMB constellation, registered
as a Patchboard node. 2026-08-20. ASCII. Canon: MMF s36, PLATFORM_SLATE v1, CURRENCY_LAW
v1/v1.1, DEPTH_SLATE v1.3, SQL_AUTONOMY v1, ECONOMY_MORNING v0.1.

HOW TO READ
- **scope** = deepest scope the node cascades to (master -> astra -> bee), MMF s36.2.
- **type** = bool | pct | numeric | cents | enum | interval | text | json.
- **source_kind**:
  - `switch`   = a boolean switch already in patchboard_switches (PATCHBOARD1).
  - `linked`   = lives in an EXISTING config table; the catalog row points at it, storage
                 is NOT duplicated (fee_schedule, thermostat_config, ...).
  - `value`    = a typed value node stored in patchboard_node_values (PATCHBOARD2, new).
  - `code_stub`= currently HARDCODED in code; node registered ahead of wiring the read.
  - `census_only` = a documented tunable with no store yet (usually an ECONOMY_MORNING open).
- **CL** = CURRENCY_LAW role: `bling_only` | `fiat_allowed` | `dual_provisional` | `fiat_dormant`.
- Storage / resolution: booleans via `get_effective_switch_state`; typed values via
  `patchboard_resolve_value` (both cascade M->A->B). Linked nodes resolve through their own
  table's reader (e.g. `fee_resolve`).

Node keys are dotted and stable. `games.*` engine nodes are COPY-PORTED verbatim into every
game repo (one node set, per-game overrides via astra scope).

===============================================================================
## 0. PATCHBOARD CORE (the switch system itself) - PATCHBOARD1, built
===============================================================================
| node_key | title | scope | type | default | source_kind | source |
|---|---|---|---|---|---|---|
| switch.tos | Terms of Service (hard) | master | bool | ON (immutable) | switch | patchboard_switches |
| switch.kyc | Identity/KYC (hard) | master | bool | ON at first OFFER | switch | patchboard_switches |
| switch.age_18_plus | 18+ age floor (hard) | master | bool | ON (immutable) | switch | patchboard_switches |
| switch.geo | Sanctioned-region block (hard) | master | bool | ON (immutable) | switch | patchboard_switches |
| switch.graphic_content | Graphic content | bee | bool | OFF (sensitive) | switch | patchboard_switches |
| switch.explicit_content | Explicit 18+ content | bee | bool | OFF (sensitive) | switch | patchboard_switches |
| switch.location_sharing | Precise/real-time location | bee | bool | OFF (sensitive) | switch | patchboard_switches |
| switch.notification_firehose | High-volume notifications | bee | bool | OFF (sensitive) | switch | patchboard_switches |
| switch.cross_astra_data_sharing | Cross-Astra data sharing | bee | bool | OFF (sensitive) | switch | patchboard_switches |
| switch.push_notifications | Push notifications | bee | bool | ON | switch | patchboard_switches |
| switch.email_notifications | Email notifications | bee | bool | ON | switch | patchboard_switches |
| switch.recommendations | Recommendations | bee | bool | ON | switch | patchboard_switches |
| switch.social_proof | Social proof | bee | bool | ON | switch | patchboard_switches |
| provider.<id>.offered | Provider offered in scope | astra | bool | per-registry | switch | patchboard_settings (connect_offer:<id>) |
| provider.<id>.used | Bee surfaces their connection | bee | bool | per-bee | switch | patchboard_settings (connect_use:<id>) |
| provider.registry | Closed provider set (10 rows) | master | json | Stripe/GA/X/OpenAI-Anthropic/GCal + Mailchimp/QuickBooks/Slack/Mastodon/BlueSky | linked | patchboard_providers |

===============================================================================
## 1. CURRENCY PINS (CURRENCY_LAW v1/v1.1) - wire NOW
===============================================================================
| node_key | title | scope | type | default | source_kind | CL |
|---|---|---|---|---|---|---|
| currency.pin | Rail for a context: BLING or USD | master->astra->bee | enum(BLING,USD) | **BLING** | value | bling_only |
| currency.fiat_allowlist | Products permitted to transact USD (closed) | master | json | h24/oracle, memberships, 406trivia, etzy, ad_slot_commercial, minutemen(provisional) | value | fiat_allowed |
| currency.pin.h24 | h24/AtlasOracle compute rail | astra | enum | USD | value | fiat_allowed |
| currency.pin.memberships | Membership subscriptions rail | astra | enum | USD | value | fiat_allowed |
| currency.pin.trivia_406 | 406trivia.games rail | astra | enum | USD | value | fiat_allowed |
| currency.pin.etzy | Etzy .store (POD passthrough) rail | astra | enum | USD | value | fiat_allowed |
| currency.pin.ad_slot_commercial | Commercial ad-slot fiat revenue | astra | enum | USD | value | fiat_allowed |
| currency.pin.minutemen | Minutemen deliveries (real-world cost) | astra | enum | USD (provisional) | value | dual_provisional |
| currency.pin.bazaar | Bazaar dual rail; fiat side dormant | astra | enum | BLING (fiat dormant) | value | fiat_dormant |
| currency.firewall.fiat_to_bling | Hard invariant: never fiat->BLiNG | master | bool | ON (immutable) | census_only | bling_only |

===============================================================================
## 2. FEES / TAKE RATES / REVENUE SPLITS (fee_schedule + canon)
===============================================================================
| node_key | title | scope | type | default | source_kind | source |
|---|---|---|---|---|---|---|
| fee.<key>.platform_pct | Platform take % per revenue stream | astra | pct | per-row | linked | fee_schedule.platform_pct |
| fee.give.platform_pct | FUND/GIVE crowdfunding fee | astra | pct | 2% (active) | linked | fee_schedule (owner 2026-08-17) |
| fee.demurrage.pct | BLiNG holding decay | master | pct | 3% (OG founders 2.5% bee-scope) | linked | fee_schedule |
| fee.bling_transfer.pct | Peer BLiNG SEND fee | master | pct | 0% (free) | linked | fee_schedule |
| fee.membership.platform_pct | Membership gross retention | master | pct | 100% | linked | fee_schedule |
| fee.oracle.platform_pct | Oracle plan gross retention | master | pct | 100% | linked | fee_schedule |
| fee.marketplace.platform_pct | Bazaar take (dormant) | astra | pct | 5% (active=false) | linked | fee_schedule |
| fee.nectar.platform_pct | Nectar take (dormant) | astra | pct | 10% (active=false) | linked | fee_schedule |
| fee.events_ticketing.platform_pct | Events take (dormant) | astra | pct | 5% (active=false) | linked | fee_schedule |
| fee.entertheprize.platform_pct | EnterThePrize take (dormant) | astra | pct | 10% (active=false) | linked | fee_schedule |
| fee.community_membership.platform_pct | Community membership take (dormant) | astra | pct | 10% (active=false) | linked | fee_schedule |
| fee.advocate.platform_pct | Advocate take (dormant) | astra | pct | 10% (active=false) | linked | fee_schedule |
| fee.blingster_rake.platform_pct | BLiNGster rake (dormant) | astra | pct | 10% (active=false) | linked | fee_schedule |
| fee.ads.platform_pct | Ads take (dormant) | astra | pct | 100% (active=false) | linked | fee_schedule |
| fee.processing.pct | Stripe processing % | master | pct | 2.9% | linked | fee_schedule.processing_pct |
| fee.processing.flat_cents | Stripe processing flat | master | cents | 30 | linked | fee_schedule.processing_flat_cents |
| fee.<key>.min_cents / .max_cents | Per-key fee clamps | astra | cents | NULL | linked | fee_schedule |
| revenue.split.bee_vs_rnd | Platform-wide 89/11 (Bees/R&D) | master | json | 89/11 | value | MMF_GIST |
| revenue.split.atom_targeted | Atom/topic-declared split | astra | json | 92/8 | value | MMF_GIST |
| ads.revenue_split | Ad revenue split copy+calc | master | json | 89/11 | code_stub | AdvertisePage.tsx:165 |

===============================================================================
## 3. BLiNG ECONOMY - THERMOSTAT / WELL / DROPS-DRIPS / SYSTEM STATE
(the ECONOMY_MORNING cluster; nothing hardcoded, all read config)
===============================================================================
| node_key | title | scope | type | default | source_kind | source |
|---|---|---|---|---|---|---|
| thermostat.daily_drops_pool | DROPS BLiNG minted/day | master | numeric | 89 | linked | thermostat_config |
| thermostat.daily_drips_pool | DRIPS BLiNG minted/day | master | numeric | 55 | linked | thermostat_config |
| drops.action.<action>.weight | DROPS points per action (13) | master | numeric | per-row (course_create 25 ... reply 1) | linked | drops_action_weight.weight |
| drops.action.<action>.rank_gated | Action requires rank | master | bool | per-row | linked | drops_action_weight.rank_gated |
| drops.action.<action>.daily_cap | Per-action daily cap | master | numeric | 20 (floor actions) | linked | drops_action_weight.daily_cap |
| drips.signal.<signal>.weight | DRIPS points per signal (10) | master | numeric | per-row (follower 500 ... page_view 1) | linked | drips_signal_weight.weight |
| drips.signal.<signal>.dedup_scope | Signal dedup window | master | enum | per-row (permanent/daily/per_24h) | linked | drips_signal_weight.dedup_scope |
| rank.multiplier.<level> | Reward multiplier by rank (33) | master | numeric | 1.0 -> 10.0 geometric | linked | rank_multiplier |
| bling.system.freeing_multiplier | Curve freeing multiplier | master | numeric | 89 | linked | bling_system_state |
| bling.system.hard_cap | BLiNG supply ceiling | master | numeric | 111222333333222110 | linked | bling_system_state |
| bling.system.offer_donation_pct | Order-book OFFER donation | master | pct | 0 (dflt 0.0099) | linked | bling_system_state |
| bling.transfer.min_amount | Min P2P transfer | master | numeric | 0.1 (code 0.001) | code_stub | bling-send/index.ts:44 |
| bling.transfer.memo_max_chars | Max memo length | master | numeric | 500 | code_stub | bling-send/index.ts:50 |
| bling.transfer.categories | Allowed SEND categories | master | enum | general,kindness,productivity,learning | code_stub | bling-send/index.ts:11 |
| bling.purchase.rank_limits | Per-rank $ purchase limits (7 bands) | master | json | tx/daily/weekly 1000..unlimited | code_stub | _shared/ranks.ts:15 |
| escrow.deposit.min_bling | Min escrow deposit | master | numeric | 0.1 | code_stub | h24-escrow-deposit:37 |
| escrow.withdraw.min_bling | Min escrow withdraw | master | numeric | 0.1 | code_stub | h24-escrow-withdraw:37 |
| well.drain_refill_balance | Faucet vs sink balance | master | json | OPEN | census_only | ECONOMY_MORNING v0.1 |
| economy.anti_gaming.decay_and_caps | Action decay + per-Bee caps | master | json | OPEN | census_only | ECONOMY_MORNING v0.1 |
| game.payout.weights | play/win/streak; solo-bot lower | master | json | OPEN | census_only | ECONOMY_MORNING v0.1 |

===============================================================================
## 4. GAMES ENGINE (copy-ported into every game repo; astra = per-game)
===============================================================================
| node_key | title | scope | type | default | source_kind | CL |
|---|---|---|---|---|---|---|
| games.currency.default_rail | Unknown-game fallback rail | master | enum | BLING | code_stub | bling_only |
| games.<id>.rail | Per-game currency toggle | astra | enum | per catalog (BLING; trivia USD) | code_stub | per-CURRENCY_LAW |
| games.<id>.staked | Game plays for stakes | astra | bool | per catalog | code_stub | - |
| games.<id>.gated18 | Game behind 18+ hard gate | astra | bool | per catalog | code_stub | - |
| games.<id>.sink | Game is a BLiNG sink | astra | bool | per catalog | code_stub | bling_only |
| games.settlement.default_distribution | Payout split | astra | json | [1] winner-take-all | code_stub | - |
| games.settlement.rake_bps_max | Rake clamp (bps) | master | numeric | 10000 | code_stub | - |
| games.<id>.rake_bps | Per-game house rake | astra | numeric | raffle 800; cards/blingster/dominoes/backgammon 500 | code_stub | bling_only |
| games.ai_seat.difficulty_levels | Solo AI difficulty | astra | numeric | 3 | census_only | - |
| games.leaderboard.elo | Per-game ELO ladder | astra | bool | on | census_only | - |

### Per-game specifics
| node_key | title | scope | type | default | source |
|---|---|---|---|---|---|
| raffle.round_seconds | HoneyPot window/TTL | astra | interval | 90 (real=daily) | game-raffle HoneyPot.tsx:36 |
| raffle.ticket_price | BLiNG per raffle ticket | astra | numeric | 10 | HoneyPot.tsx:37 |
| raffle.rake_bps | Raffle house share -> Well | astra | numeric | 800 (8%) | HoneyPot.tsx:38 |
| cards.spades.stake/rake/target | Spades table config | astra | json | 25 / 500 / 500 | cards/index.ts:71 |
| cards.hearts.stake/rake/target | Hearts table config | astra | json | 25 / 500 / 100 | cards/index.ts:83 |
| cards.deal_size / cards.seats | Deck deal / seat count | astra | numeric | 13 / 4 | cards/index.ts,engine.ts |
| blingster.hall_live | Real-BLiNG settlement ship switch | master | bool | OFF (legal walk gate) | blingster/gate.ts |
| blingster.rake_bps | Wager-hall rake | astra | numeric | 500 (5%) | blingster/mock.ts:25 |
| blingster.question_seconds | Per-question clock | astra | numeric | 20 | play/round.ts:21 |
| blingster.base_points | Points per correct | astra | numeric | 100 | play/round.ts:23 |
| blingster.max_speed_bonus | Speed bonus ceiling | astra | numeric | 100 | play/round.ts:25 |
| blingster.round_size | Questions per round | astra | numeric | 8 | play/round.ts:27 |
| bingo.ball_count | Bingo ruleset (structural) | astra | numeric | 75-ball 5x5 | bingo/engine.ts:54 |

===============================================================================
## 5. TRIVIA (406trivia / thetrivia) - USD rail
===============================================================================
| node_key | title | scope | type | default | source |
|---|---|---|---|---|---|
| trivia.channel_pace_ms | Question cadence | venue->astra->session | interval | 180000 (180s; TEST 60000) | GAMES_MF v0.3 |
| trivia.free_vs_paid | Channel free / Night paid gating | venue | enum | channel FREE; night/league paid | GAMES_MF v0.3 |
| venue.plan.price_map | Venue SaaS plan prices | astra | cents | 49/99/999 USD | venue-checkout:44 |
| trivia.gen.model / validate.model | Question gen/validate models | astra | text | haiku / sonnet | generate-questions:12 |
| trivia.gen.defaults | difficulty/count/max | astra | json | 2 / 5 / 25 | generate-questions:224 |
| trivia.question.schema | choices / difficulty range | astra | json | 4 choices, 1-5 | generate-questions:123 |
| trivia.gen.dedupe_threshold | Near-dup Jaccard | astra | numeric | 0.7 | generate-questions:144 |
| trivia.gen.max_tokens | gen/atom/validate budgets | astra | json | 4096/1024/256 | generate-questions:236 |
| trivia.host.model | Emcee model | astra | text | haiku | trivia-host:12 |
| trivia.host.max_tokens | Emcee line budget | astra | numeric | 150 | trivia-host:81 |
| trivia.host.leaderboard_n | Emcee leaderboard size | astra | numeric | 8 | trivia-host:104 |

===============================================================================
## 6. ORACLE / h24 - ROUTER, TIERS, TOKENS, DEADMAN
===============================================================================
| node_key | title | scope | type | default | source |
|---|---|---|---|---|---|
| oracle.tier.model_map | tier->model pins | master | json | haiku-4-5 / sonnet-5 / opus-5 | h24-route:77 |
| oracle.tier.thinking | per-tier effort | master | enum | medium/high | h24-route:103 |
| oracle.tier.output_estimate | output-token estimate | master | json | base 500/3000/8000 | h24-route:115 |
| oracle.tier.max_tokens | per-tier ceiling | master | json | 800/8000/32000 | h24-route:129 |
| oracle.paid_tiers_enabled | Paid-tier kill switch | master | bool | true | h24-route:143 |
| oracle.frontier.preview_threshold_tokens | Frontier confirm gate | master | numeric | 700 | h24-route:167 |
| oracle.cost.overage_warn_ratio | Overage warn ratio | master | numeric | 1.25 | h24-route:168 |
| oracle.est.chars_per_token | Token heuristic | master | numeric | 4 | h24-route:169 |
| oracle.directive.max_chars | Abuse cap | master | numeric | 10000 | h24-route:170 |
| oracle.free.groq_model | Free-tier model | master | text | llama-3.1-8b-instant | h24-route:193 |
| oracle.provider.registry | Provider base URLs/secrets/cache | master | json | OpenAI/DeepSeek/Mistral/xAI/Groq | h24-route:239 |
| oracle.provider_pool.selection_weight | AI provider load-balance weight | master | numeric | 1 | linked h24_provider_pool |
| oracle.ratecap.retry_after_default | Rate-cap retry fallback | master | numeric | 60 | h24-route:1090 |
| oracle.auto.category_floor | Per-category band floor | master | json (linked) | h24_category_band_floor (10 rows) | linked + autotier.ts:59 fallback |
| oracle.auto.unknown_floor | Unknown-category fail-safe | master | enum | standard | autotier.ts:74 |
| oracle.auto.short_form_categories | Length-check exempt | master | enum | classify,translate,estimate | autotier.ts:142 |
| oracle.auto.substance_floor | Substance-floor char thresholds | master | json | 120/600/0.15 | autotier.ts:159 |
| oracle.token.anchor | fiat<->token peg | master | numeric | 1000 tok = $1 | ORACLE_MF v0.27 |
| oracle.plan.tiers | Oracle plan prices/allowances | master | json | Scout $9/10k, Oracle $29/40k, Sovereign $99/150k | linked h24_token_plans (900/2900/9900) |
| oracle.token.packs | One-off token packs | master | cents | 500/1000/2500/6000 | linked h24_token_packs |
| oracle.free.cap | Free-tier msg/cost ceiling | master | json | 15-20 msg/day, <$0.30/mo | ORACLE_MF v0.31 |
| oracle.vault.storage_pricing | GB-month quota + overflow | master | json | OPEN | ORACLE_MF v1.32 |
| deadman.inactivity_threshold | Stage-1 trigger | bee | interval | user-set | ORACLE_MF v1.32 |
| deadman.grace_period | Stage-2 grace | bee | interval | user-set | ORACLE_MF v1.32 |
| deadman.m_of_n | Stage-3 fire gate | bee | json | per-instruction | ORACLE_MF v1.32 |
| deadman.wallet_inheritance | Tokens transfer on fire | master | bool | OPEN | ORACLE_MF v1.32 |
| stripe.api_version | Stripe API pin | master | text | 2026-03-25.dahlia | _shared/stripe.ts:19 |

===============================================================================
## 7. MEMBERSHIPS / IDENTITY / NEWS / CONTENT / OTHER ASTRAS
===============================================================================
| node_key | title | scope | type | default | source |
|---|---|---|---|---|---|
| membership.ad_relief.ladder | Subscription tiers | master | enum | drone/worker/guardian/queen | PLATFORM_SLATE v1 |
| identity.faces.free_count | Free nicknames before sink | bee | numeric | 1 (extra = BLiNG sink) | IDENTITY_MODEL v1.0 |
| identity.faces.sink_currency | Extra-face currency | master | enum | BLING (never fiat) | IDENTITY_MODEL v1.0 |
| identity.handle.change_rate_limit | Handle churn limit | bee | interval | rate-limitable (handle_changed_at) | IDENTITY_MODEL v1.0 |
| identity.nickname.scope | Global-unique vs per-surface | master | enum | OPEN | IDENTITY_MODEL v1.0 |
| news.slot.length | Broadcast slot length | astra | interval | 1 hour | MMF_GIST s38 |
| news.slot.max_per_bee_day | Slots per Bee/day | bee | numeric | 2 | MMF_GIST |
| news.slot.pricing_model | Off-peak fixed + peak auction | astra | json | Model B | MMF_GIST |
| news.prime_time.thresholds | Simulcast upgrade ladder | astra | json | viewer-threshold | MMF_GIST |
| news.ad_sourcing.modes | How ads attach | astra | enum | 4 modes | MMF_GIST |
| press.edition.commit_pct | /press funding commit threshold | astra | pct | 90 | linked press_editions |
| press.edition.trigger_pct | Deposit trigger threshold | astra | pct | 95 | linked press_editions (code fallback :94) |
| press.edition.print_pct | Print threshold | astra | pct | 100 | linked press_editions |
| press.edition.affiliate_pct | Affiliate slice | astra | pct | 10 | linked press_editions |
| press.zone.price_multiplier | Geo/placement price scaling | astra | numeric | 0.85/1.0/1.5 | linked press_zones |
| press.installment_schedule | hold/deposit/balance split | astra | json | 20/60/20 | press-checkout:99 |
| bazaar.offer.default_accepts | Default rail on new offer | astra | json | bling:true, fiat:false | bazaar.ts:187 |
| bazaar.split.bling_split_max | Per-listing BLiNG/fiat split cap | bee | numeric | per-listing | linked bazaar_listings |
| justice.spawn_max_depth | Justice-tree max depth | master | numeric | 8 | linked justice_settings |
| justice.create_requires_admin | Case creation gate | master | bool | true | linked justice_settings |
| ui.background_softness | Global UI softness | master | numeric | 0.90 | linked ui_theme_config |
| ui.branding | Accent/logo/favicon | master | json | Rebelution red #DC2626 | linked ui_theme_config |
| skins.<id>.background_softness | Per-skin softness | astra/bee | numeric | 0.90 | linked skins (7 presets) |

===============================================================================
## SUMMARY / STANDING RULE
===============================================================================
The mandate (CURRENCY_LAW v1.1 + ECONOMY_MORNING v0.1): NO reward/weight/rate/pin is
hardcoded - all read the Patchboard / fee_schedule / drops-drips weights. This census is the
enumeration of that mandate. ~130 nodes across 8 categories.

- **switch** (13 + provider pairs): built, PATCHBOARD1 (unapplied draft).
- **linked** (fee_schedule 14, thermostat 2, drops 13, drips 10, rank 33, bling_system 3,
  press_*, justice 2, ui 2, skins, h24_token_plans/packs, h24_provider_pool, h24_category_band_floor):
  existing tables; catalog points at them, storage NOT duplicated.
- **value** (currency pins, 89/11, 92/8): new typed nodes -> patchboard_node_values.
- **code_stub** (~40, mostly games engine + oracle router + bling-send): HARDCODED today;
  registered here as the wiring backlog. Biggest cluster = games rake/stake/timer literals
  (two rakes coexist: raffle 800bps vs cards/blingster 500bps - no single source; strong
  Patchboard candidate `games.<id>.rake_bps` master default).
- **census_only** (ECONOMY_MORNING opens): Well balance, game payout weights, anti-gaming
  decay/caps, oracle vault pricing, deadman wallet inheritance, nickname scope.

CURRENCY_LAW wired: `currency.pin` = BLING everywhere; USD only for the 6-entry fiat allowlist
(h24, memberships, 406trivia, etzy, commercial ad_slot, minutemen-provisional); bazaar fiat
dormant; firewall (never fiat->BLiNG) immutable.

Storage: catalog = `patchboard_nodes`; typed values = `patchboard_node_values` (resolver
`patchboard_resolve_value`, cascade M->A->B). Both propose-first in
supabase/migrations/_drafts/patchboard2_node_catalog_v1.sql (+ seed + rollback). Apply lands
with the patchboard1 switch family on the db lane.
