-- Seed the Astra constellation (Butch-ratified 2026-06-09). status=off_grid (registered/dark; flips to active at each launch).
-- themanual untouched (already active/live). display_name/domain best-effort; slugs are the FK anchors.
-- notes carries provisional role taxonomy (surface|layer|umbrella|root|platform) pending a real astra_registry.kind column.
-- Code follow-up: reconcile display_name/domain against canonical/master-master-file-current.md; correct any drift via UPDATE.
INSERT INTO public.astra_registry (slug, display_name, domain, status, notes) VALUES
('atlasnation','AtlasNATION','atlasnation.com','off_grid','surface | Groups/Novas'),
('atlasintel','AtlasINTEL','atlasintel.fyi','off_grid','surface | Forum'),
('atlasunited','AtlasUNITED','atlasunited.fyi','off_grid','surface | Events'),
('atlascomms','AtlasCOMMS','atlascomms.live','off_grid','surface | Comms'),
('atlaslounge','AtlasLOUNGE','atlaslounge.com','off_grid','surface | Lounge'),
('atlasvote','AtlasVOTE','atlasvote.org','off_grid','surface | Elections/Voting (sovereign, not betting)'),
('atlasads','atlasADs','atlasads.biz','off_grid','surface | Ads/Promotions'),
('entertheprize','Entertheprize','entertheprize.com','off_grid','surface | Marketplace'),
('atlasresidential','AtlasRESIDENTIAL','atlasresidential.com','off_grid','surface | Real Estate'),
('atlasenlightened','AtlasENLIGHTENED','atlasenlightened.com','off_grid','surface | Education'),
('atlasindustry','AtlasIndustry','atlasindustry.com','off_grid','surface | Pro Services'),
('atlasadvocate','AtlasADVOCATE','atlasadvocate.com','off_grid','surface | Legal'),
('freedomnetwork','Freedom Network','freedomnetwork.app','off_grid','surface | News/Video; creator side freedomplatform.app'),
('freedomrings','FreedomRINGS.online','freedomrings.online','off_grid','surface | AI Tours / Gateway (sec24)'),
('braindualgames','Braindual.games','braindual.games','off_grid','surface | Games house (trivia)'),
('houseofcardgames','Houseofcard.games','houseofcard.games','off_grid','surface | Games house (cards)'),
('thebeegames','TheBee.games','thebee.games','off_grid','surface | Games house (spelling)'),
('blingster','BLiNGster.org','blingster.org','off_grid','surface | Games house, 18+ wagering'),
('atlasoracle','AtlasORACLE','atlasoracle.to','off_grid','layer | AI (not per-atom surface)'),
('brandosophic','BRANDoSOPHIC','brandosophic.com','off_grid','layer | Skins (not per-atom surface)'),
('dingleberry','DingleBERRY.tech','dingleberry.tech','off_grid','layer | Defense/security/anti-malware'),
('thehoneycombgames','TheHoneycomb.games','thehoneycomb.games','off_grid','umbrella | Games catalog'),
('honeycombglobal','HoneyComb.global','honeycomb.global','off_grid','root | mother constellation hub (7-hex flower)'),
('freedomblings','FreedomBLiNGS.com','freedomblings.com','off_grid','platform | BLiNG! ledger/wallet/escrow front-end')
ON CONFLICT (slug) DO NOTHING;
