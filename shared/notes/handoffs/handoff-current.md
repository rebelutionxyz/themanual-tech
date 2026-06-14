HANDOFF — TheMANUAL.tech nav redesign + cross-Astra realm lens (full-depth)



LIVE IN PROD (via MCP, already active):

\- astra\_registry grouping: 8 hidden, Community 7, Services 10

\- astra\_registry anon SELECT policy → grid reads for logged-out visitors

\- forum\_threads.realm\_path text\[] + GIN → full-depth realm-lens narrowing

\- 8 demo threads seeded (Culture 6 / Justice 2; surfaces intel·unite·rule·

&#x20; pulse·comms·give) so the lens + Source chips have content

\- 3 old junk test threads still present, untagged (AI to file, or drop)



COMMITTED (batch 1, deployed): global TopToolbar (IntelToolbar deleted);

silver popups; PlatformRail + GeoLensBar deleted; promoted slot in content;

IntelSidebar default-open/sticky; header drop gone, wordmark TheMANUAL.tech;

grid from registry; realm lens (useLensStore, listRealmFeed prefix on

realm\_path, /realm/:realmId + RealmFeedPage, Source chips); singular labels;

mobile chip row one line.

→ "feat: global toolbar + cross-Astra realm lens; retire side rails"



STAGED (batch 2 — COMMIT THIS): full-tree composer (RealmPathPicker replaces

RealmPicker; InlineComposer/NewThreadPage/IntelPage write realm\_path any depth,

primary\_realm/L2 synced); Dingleberry + Manual sidebars default-open/sticky;

anon-policy parity migration (20260613161000).

→ "feat: full-depth realm\_path composer + default-open sidebars"



BOTH migrations have repo parity files (realm\_path in batch 1; anon-select in 2).



OPEN / DEFERRED (non-blocking):

\- Astra domains off\_grid — only themanual active. Per-domain go-live = bind

&#x20; domain to Railway (Butch) + flip registry status off\_grid→active (Chat/MCP)

\- Toolbar stubs: Time (Intel windows + era stub), Location, Addon — wire later

\- Freedomblings sidebar left as-is (Aurora CSS skin) — skin-native tweak if wanted

\- listRealmFeed uses @> + client exact-prefix; move to server RPC when data grows

\- patchboard-ize anon-grid visibility later (RLS = floor, patchboard = toggle)

\- Verify BLiNG! mark orientation: HoneyDrop still in UtilityChrome (avatar link)

&#x20; — firewall is point-DOWN, confirm it's not point-up



IMMEDIATE NEXT: approve RealmPicker delete (option 1, keep rm gated) → rebuild →

commit batch 2 → redeploy → smoke-test (anon grid; /realm/culture drill

Sports→Combat sports; Source chips; full-tree composer tags deep).

