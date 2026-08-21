-- ============================================================================
-- PATCHBOARD2 - node census SEED  (DRAFT - propose-first; run AFTER catalog DDL)
-- Registers the census into patchboard_nodes. Idempotent (ON CONFLICT DO NOTHING).
-- Linked config tables get ONE catalog pointer each (source_ref='*') - the per-row
-- values stay in their table; storage is never duplicated. ASCII only.
-- Full human-readable list: docs/patchboard-node-census.md  |  canon: ops_docs PATCHBOARD_NODES v1.
-- ============================================================================
BEGIN;

INSERT INTO public.patchboard_nodes
  (node_key, title, category, scope_level, value_type, default_value, allowed_values,
   source_kind, source_table, source_column, source_ref, currency_law_role, where_used, status, notes)
VALUES
-- 1. CURRENCY PINS (CURRENCY_LAW v1/v1.1) --------------------------------------
('currency.pin','Rail for a context (BLING|USD)','currency','master','enum','BLING','BLING,USD','value',NULL,NULL,NULL,'bling_only','depth rails / games engine','active','Pinned BLING everywhere except the fiat allowlist'),
('currency.fiat_allowlist','Products permitted to transact USD (closed)','currency','master','json','["h24","memberships","trivia_406","etzy","ad_slot_commercial","minutemen_provisional"]',NULL,'value',NULL,NULL,NULL,'fiat_allowed','CURRENCY_LAW','active','Owner-ruled closed set'),
('currency.pin.h24','h24/AtlasOracle compute rail','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'fiat_allowed','h24','active',NULL),
('currency.pin.memberships','Membership subscriptions rail','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'fiat_allowed','memberships','active',NULL),
('currency.pin.trivia_406','406trivia.games rail','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'fiat_allowed','trivia','active',NULL),
('currency.pin.etzy','Etzy .store (POD passthrough) rail','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'fiat_allowed','etzy','active',NULL),
('currency.pin.ad_slot_commercial','Commercial ad-slot fiat revenue','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'fiat_allowed','ads','active',NULL),
('currency.pin.minutemen','Minutemen deliveries (real-world cost)','currency','astra','enum','USD','BLING,USD','value',NULL,NULL,NULL,'dual_provisional','minutemen','provisional','Fiat side activates on owner confirm at Minutemen walk'),
('currency.pin.bazaar','Bazaar dual rail; fiat side dormant','currency','astra','enum','BLING','BLING,USD','value',NULL,NULL,NULL,'fiat_dormant','bazaar','dormant','accepts_bling/accepts_fiat cols exist'),
('currency.firewall.fiat_to_bling','Hard invariant: never fiat->BLiNG','currency','master','bool','true',NULL,'census_only',NULL,NULL,NULL,'bling_only','MMF s5.13','active','Immutable; only touch = KYC order-book OFFER'),
-- 2. FEES / SPLITS -------------------------------------------------------------
('fee.platform_pct','Platform take % per revenue stream','fee','astra','pct',NULL,NULL,'linked','fee_schedule','platform_pct','*',NULL,'fee_resolve()','active','14 keyed rows; resolve via fee_resolve(key,astra,bee)'),
('fee.give.platform_pct','FUND/GIVE crowdfunding fee','fee','astra','pct','2',NULL,'linked','fee_schedule','platform_pct','give','fiat_allowed','fountain','active','Owner 2026-08-17; application_fee'),
('fee.demurrage.pct','BLiNG holding decay','fee','master','pct','3',NULL,'linked','fee_schedule','platform_pct','demurrage','bling_only','not built yet','active','OG founders 2.5% bee-scope'),
('fee.bling_transfer.pct','Peer BLiNG SEND fee','fee','master','pct','0',NULL,'linked','fee_schedule','platform_pct','bling_transfer','bling_only','bling_send','active','Free'),
('fee.processing.pct','Stripe processing %','fee','master','pct','2.9',NULL,'linked','fee_schedule','processing_pct','*','fiat_allowed','stripe','active',NULL),
('fee.processing.flat_cents','Stripe processing flat','fee','master','cents','30',NULL,'linked','fee_schedule','processing_flat_cents','*','fiat_allowed','stripe','active',NULL),
('revenue.split.bee_vs_rnd','Platform-wide 89/11 (Bees/R&D)','split','master','json','{"bees":89,"rnd":11}',NULL,'value',NULL,NULL,NULL,NULL,'MMF_GIST','active','Thesis split'),
('revenue.split.atom_targeted','Atom/topic-declared split','split','astra','json','{"a":92,"b":8}',NULL,'value',NULL,NULL,NULL,NULL,'MMF_GIST','active',NULL),
('ads.revenue_split','Ad revenue split (copy+calc)','split','master','json','{"bees":89,"rnd":11}',NULL,'code_stub',NULL,NULL,NULL,NULL,'AdvertisePage.tsx:165','active','Hardcoded in copy; wire to node'),
-- 3. THERMOSTAT / DROPS / DRIPS / RANK / SYSTEM STATE --------------------------
('thermostat.daily_drops_pool','DROPS BLiNG minted/day','reward','master','numeric','89',NULL,'linked','thermostat_config','daily_drops_pool','1','bling_only','drops','active',NULL),
('thermostat.daily_drips_pool','DRIPS BLiNG minted/day','reward','master','numeric','55',NULL,'linked','thermostat_config','daily_drips_pool','1','bling_only','drips','active',NULL),
('drops.action.weight','DROPS points per action','weight','master','numeric',NULL,NULL,'linked','drops_action_weight','weight','*','bling_only','drops engine','active','13 keyed rows'),
('drips.signal.weight','DRIPS points per signal','weight','master','numeric',NULL,NULL,'linked','drips_signal_weight','weight','*','bling_only','drips engine','active','10 keyed rows'),
('rank.multiplier','Reward multiplier by rank','reward','master','numeric',NULL,NULL,'linked','rank_multiplier','multiplier','*','bling_only','drops/drips payout','active','33 levels, 1.0->10.0'),
('bling.system.freeing_multiplier','Curve freeing multiplier','numeric','master','numeric','89',NULL,'linked','bling_system_state','freeing_multiplier','1','bling_only','curve','active',NULL),
('bling.system.hard_cap','BLiNG supply ceiling','threshold','master','numeric','111222333333222110',NULL,'linked','bling_system_state','hard_cap','1','bling_only','curve','active',NULL),
('bling.system.offer_donation_pct','Order-book OFFER donation','pct','master','pct','0',NULL,'linked','bling_system_state','offer_donation_pct','1','bling_only','order book','active','dflt 0.0099'),
('bling.transfer.min_amount','Min P2P transfer','threshold','master','numeric','0.1',NULL,'code_stub',NULL,NULL,NULL,'bling_only','bling-send:44','active','Code has 0.001; canon min 0.1'),
('bling.transfer.memo_max_chars','Max memo length','threshold','master','numeric','500',NULL,'code_stub',NULL,NULL,NULL,NULL,'bling-send:50','active',NULL),
('bling.transfer.categories','Allowed SEND categories','enum','master','enum','general,kindness,productivity,learning',NULL,'code_stub',NULL,NULL,NULL,NULL,'bling-send:11','active',NULL),
('bling.purchase.rank_limits','Per-rank $ purchase limits','threshold','master','json',NULL,NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','_shared/ranks.ts:15','active','7 bands tx/daily/weekly'),
('escrow.deposit.min_bling','Min escrow deposit','threshold','master','numeric','0.1',NULL,'code_stub',NULL,NULL,NULL,'bling_only','h24-escrow-deposit:37','active',NULL),
('escrow.withdraw.min_bling','Min escrow withdraw','threshold','master','numeric','0.1',NULL,'code_stub',NULL,NULL,NULL,'bling_only','h24-escrow-withdraw:37','active',NULL),
('well.drain_refill_balance','Faucet vs sink balance','reward','master','json',NULL,NULL,'census_only',NULL,NULL,NULL,'bling_only','ECONOMY_MORNING','planned','OPEN'),
('economy.anti_gaming.decay_and_caps','Action decay + per-Bee caps','threshold','master','json',NULL,NULL,'census_only',NULL,NULL,NULL,'bling_only','ECONOMY_MORNING','planned','OPEN'),
('game.payout.weights','Play/win/streak; solo-bot lower','weight','master','json',NULL,NULL,'census_only',NULL,NULL,NULL,'bling_only','ECONOMY_MORNING','planned','OPEN'),
-- 4. GAMES ENGINE (copy-ported; astra = per-game) -----------------------------
('games.currency.default_rail','Unknown-game fallback rail','game_rule','master','enum','BLING','BLING,USD','code_stub',NULL,NULL,NULL,'bling_only','engine/currency.ts:88','active',NULL),
('games.rail','Per-game currency toggle','currency','astra','enum','BLING','BLING,USD','code_stub',NULL,NULL,NULL,NULL,'engine/catalog.ts','active','Per-game; trivia USD'),
('games.staked','Game plays for stakes','game_rule','astra','bool',NULL,NULL,'code_stub',NULL,NULL,NULL,NULL,'engine/catalog.ts','active',NULL),
('games.gated18','Game behind 18+ hard gate','game_rule','astra','bool',NULL,NULL,'code_stub',NULL,NULL,NULL,NULL,'engine/catalog.ts','active',NULL),
('games.sink','Game is a BLiNG sink','game_rule','astra','bool',NULL,NULL,'code_stub',NULL,NULL,NULL,'bling_only','engine/catalog.ts','active',NULL),
('games.settlement.default_distribution','Payout split','split','astra','json','[1]',NULL,'code_stub',NULL,NULL,NULL,NULL,'engine/settlement.ts:104','active','winner-take-all'),
('games.settlement.rake_bps_max','Rake clamp (bps)','threshold','master','numeric','10000',NULL,'code_stub',NULL,NULL,NULL,NULL,'engine/settlement.ts:78','active',NULL),
('games.rake_bps','Per-game house rake (bps)','fee','astra','numeric','500',NULL,'code_stub',NULL,NULL,NULL,'bling_only','per-game lib','active','raffle 800; cards/blingster/dominoes/backgammon 500 - NO single source today'),
('games.ai_seat.difficulty_levels','Solo AI difficulty','game_rule','astra','numeric','3',NULL,'census_only',NULL,NULL,NULL,NULL,'GAMES_SLATE v2','active',NULL),
('raffle.round_seconds','HoneyPot window/TTL','window','astra','interval','90',NULL,'code_stub',NULL,NULL,NULL,NULL,'HoneyPot.tsx:36','active','real=daily'),
('raffle.ticket_price','BLiNG per raffle ticket','numeric','astra','numeric','10',NULL,'code_stub',NULL,NULL,NULL,'bling_only','HoneyPot.tsx:37','active',NULL),
('raffle.rake_bps','Raffle house share -> Well','fee','astra','numeric','800',NULL,'code_stub',NULL,NULL,NULL,'bling_only','HoneyPot.tsx:38','active',NULL),
('cards.table_config','Spades/Hearts stake/rake/target','game_rule','astra','json','{"spades":[25,500,500],"hearts":[25,500,100]}',NULL,'code_stub',NULL,NULL,NULL,'bling_only','cards/index.ts:71','active',NULL),
('blingster.hall_live','Real-BLiNG settlement ship switch','game_rule','master','bool','false',NULL,'code_stub',NULL,NULL,NULL,'bling_only','blingster/gate.ts','active','Legal walk gate; OFF'),
('blingster.rake_bps','Wager-hall rake (bps)','fee','astra','numeric','500',NULL,'code_stub',NULL,NULL,NULL,'bling_only','blingster/mock.ts:25','active',NULL),
('blingster.round','question_seconds/base_points/speed_bonus/round_size','game_rule','astra','json','{"qsec":20,"base":100,"bonus":100,"size":8}',NULL,'code_stub',NULL,NULL,NULL,NULL,'play/round.ts','active',NULL),
-- 5. TRIVIA (USD) --------------------------------------------------------------
('trivia.channel_pace_ms','Question cadence','game_rule','astra','interval','180000',NULL,'value',NULL,NULL,NULL,'fiat_allowed','GAMES_MF v0.3','active','TEST 60000'),
('trivia.free_vs_paid','Channel free / Night paid gating','game_rule','astra','enum','channel_free',NULL,'census_only',NULL,NULL,NULL,'fiat_allowed','GAMES_MF v0.3','active',NULL),
('venue.plan.price_map','Venue SaaS plan prices','tier','astra','cents','[4900,9900,99900]',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','venue-checkout:44','active','$49/99/999'),
('trivia.gen.params','model/difficulty/count/dedupe/max_tokens','game_rule','astra','json','{"gen":"haiku","validate":"sonnet","difficulty":2,"count":5,"max":25,"dedupe":0.7}',NULL,'code_stub',NULL,NULL,NULL,NULL,'generate-questions:12','active',NULL),
('trivia.host.params','emcee model/max_tokens/leaderboard_n','game_rule','astra','json','{"model":"haiku","max_tokens":150,"leaderboard_n":8}',NULL,'code_stub',NULL,NULL,NULL,NULL,'trivia-host:12','active',NULL),
-- 6. ORACLE / h24 --------------------------------------------------------------
('oracle.tier.model_map','tier->model pins','tier','master','json','{"floor":"haiku-4-5","mid":"sonnet-5","frontier":"opus-5"}',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','h24-route:77','active',NULL),
('oracle.tier.max_tokens','per-tier ceiling','threshold','master','json','[800,8000,32000]',NULL,'code_stub',NULL,NULL,NULL,NULL,'h24-route:129','active',NULL),
('oracle.paid_tiers_enabled','Paid-tier kill switch','game_rule','master','bool','true',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','h24-route:143','active',NULL),
('oracle.frontier.preview_threshold_tokens','Frontier confirm gate','threshold','master','numeric','700',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','h24-route:167','active',NULL),
('oracle.directive.max_chars','Directive abuse cap','threshold','master','numeric','10000',NULL,'code_stub',NULL,NULL,NULL,NULL,'h24-route:170','active',NULL),
('oracle.provider.registry','Provider base URLs/secrets/cache','provider','master','json',NULL,NULL,'code_stub',NULL,NULL,NULL,NULL,'h24-route:239','active','Candidate to move to catalog'),
('oracle.provider_pool.selection_weight','AI provider load-balance weight','weight','master','numeric','1',NULL,'linked','h24_provider_pool','selection_weight','*',NULL,'router','active',NULL),
('oracle.auto.category_floor','Per-category band floor','tier','master','enum',NULL,'free,standard,frontier','linked','h24_category_band_floor','floor_band','*',NULL,'autotier','active','10 rows; code fallback autotier.ts:59'),
('oracle.token.anchor','fiat<->token peg','numeric','master','numeric','1000',NULL,'value',NULL,NULL,NULL,'fiat_allowed','ORACLE_MF v0.27','active','1000 tok = $1'),
('oracle.plan.tiers','Oracle plan prices/allowances','tier','master','json',NULL,NULL,'linked','h24_token_plans','usd_cents','*','fiat_allowed','memberships','active','Scout/Oracle/Sovereign 900/2900/9900'),
('oracle.token.packs','One-off token packs','tier','master','cents',NULL,NULL,'linked','h24_token_packs','usd_cents','*','fiat_allowed','tokens','active','500/1000/2500/6000'),
('oracle.free.cap','Free-tier msg/cost ceiling','threshold','master','json','{"msgs_day":20,"cost_month_usd":0.30}',NULL,'census_only',NULL,NULL,NULL,'fiat_allowed','ORACLE_MF v0.31','active',NULL),
('oracle.vault.storage_pricing','GB-month quota + overflow','tier','master','json',NULL,NULL,'census_only',NULL,NULL,NULL,'fiat_allowed','ORACLE_MF v1.32','planned','OPEN'),
('deadman.inactivity_threshold','Stage-1 trigger','window','bee','interval',NULL,NULL,'value',NULL,NULL,NULL,NULL,'ORACLE_MF v1.32','active','user-set'),
('deadman.grace_period','Stage-2 grace','window','bee','interval',NULL,NULL,'value',NULL,NULL,NULL,NULL,'ORACLE_MF v1.32','active','user-set'),
('deadman.m_of_n','Stage-3 fire gate','threshold','bee','json',NULL,NULL,'value',NULL,NULL,NULL,NULL,'ORACLE_MF v1.32','active','per-instruction'),
('deadman.wallet_inheritance','Tokens transfer on fire','game_rule','master','bool',NULL,NULL,'census_only',NULL,NULL,NULL,NULL,'ORACLE_MF v1.32','planned','OPEN'),
('stripe.api_version','Stripe API pin','text','master','text','2026-03-25.dahlia',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','_shared/stripe.ts:19','active',NULL),
-- 7. MEMBERSHIPS / IDENTITY / NEWS / CONTENT / OTHER ---------------------------
('membership.ad_relief.ladder','Subscription tiers','tier','master','enum','drone,worker,guardian,queen',NULL,'value',NULL,NULL,NULL,'fiat_allowed','PLATFORM_SLATE v1','active',NULL),
('identity.faces.free_count','Free nicknames before sink','threshold','bee','numeric','1',NULL,'value',NULL,NULL,NULL,'bling_only','IDENTITY_MODEL v1.0','active','extra = BLiNG sink'),
('identity.handle.change_rate_limit','Handle churn limit','window','bee','interval',NULL,NULL,'value',NULL,NULL,NULL,NULL,'IDENTITY_MODEL v1.0','active','handle_changed_at exists'),
('identity.nickname.scope','Global-unique vs per-surface','enum','master','enum',NULL,'global,per_surface','census_only',NULL,NULL,NULL,NULL,'IDENTITY_MODEL v1.0','planned','OPEN'),
('news.slot.length','Broadcast slot length','window','astra','interval','3600',NULL,'value',NULL,NULL,NULL,NULL,'MMF s38','active','1 hour'),
('news.slot.max_per_bee_day','Slots per Bee/day','threshold','bee','numeric','2',NULL,'value',NULL,NULL,NULL,NULL,'MMF_GIST','active',NULL),
('news.slot.pricing_model','Off-peak fixed + peak auction','game_rule','astra','json',NULL,NULL,'value',NULL,NULL,NULL,NULL,'MMF_GIST','active','Model B'),
('press.edition.thresholds','commit/trigger/print/affiliate %','pct','astra','json','{"commit":90,"trigger":95,"print":100,"affiliate":10}',NULL,'linked','press_editions',NULL,'*','fiat_allowed','press','active',NULL),
('press.zone.price_multiplier','Geo/placement price scaling','numeric','astra','numeric',NULL,NULL,'linked','press_zones','price_multiplier','*','fiat_allowed','press','active','0.85/1.0/1.5'),
('press.installment_schedule','hold/deposit/balance split','split','astra','json','[20,60,20]',NULL,'code_stub',NULL,NULL,NULL,'fiat_allowed','press-checkout:99','active',NULL),
('bazaar.offer.default_accepts','Default rail on new offer','currency','astra','json','{"bling":true,"fiat":false}',NULL,'code_stub',NULL,NULL,NULL,'fiat_dormant','bazaar.ts:187','active',NULL),
('bazaar.split.bling_split_max','Per-listing BLiNG/fiat split cap','numeric','bee','numeric',NULL,NULL,'linked','bazaar_listings','bling_split_max','*','fiat_dormant','bazaar','active',NULL),
('justice.spawn_max_depth','Justice-tree max depth','threshold','master','numeric','8',NULL,'linked','justice_settings','spawn_max_depth','1',NULL,'justice','active',NULL),
('justice.create_requires_admin','Case creation gate','game_rule','master','bool','true',NULL,'linked','justice_settings','create_requires_admin','1',NULL,'justice','active',NULL),
('ui.background_softness','Global UI softness','theme','master','numeric','0.90',NULL,'linked','ui_theme_config','background_softness','1',NULL,'shell','active',NULL),
('ui.branding','Accent/logo/favicon','theme','master','json',NULL,NULL,'linked','ui_theme_config','branding','1',NULL,'shell','active','Rebelution red #DC2626'),
('skins.background_softness','Per-skin softness','theme','astra','numeric','0.90',NULL,'linked','skins','background_softness','*',NULL,'shell','active','7 presets')
ON CONFLICT (node_key) DO NOTHING;

COMMIT;
