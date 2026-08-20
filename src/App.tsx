import { CallProvider } from '@/components/comms/CallProvider';
import { HQControlRoom } from '@/components/hq/HQControlRoom';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TopTickerSlot } from '@/components/promotions/TopTickerSlot';
import { PopupRoute } from '@/components/shell/PopupShell';
import {
  CartPlaceholder,
  ManualGroupsPlaceholder,
  OpenAPIDocs,
  StatusPage,
} from '@/components/universal/UniversalPlaceholders';
import { AstraProvider, useAstra } from '@/lib/astras/AstraContext';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useUserRole } from '@/lib/useUserRole';
import { useBranding } from '@/stores/useBranding';
import { lazy, Suspense, useEffect } from 'react';
import { type Location, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ASTRA_STUB_ENTRIES } from '@/lib/astra-catalog';
const AccountHubPage = lazy(() => import('@/pages/account/AccountHubPage').then((m) => ({ default: m.AccountHubPage })));
const AdvertisePage = lazy(() => import('@/pages/AdvertisePage').then((m) => ({ default: m.AdvertisePage })));
// FRONT21 — the constellation shell. Every Astra has a route in themanual.tech
// (ORACLE_MF v1.24); the ones with no ported code render an honest stub.
const AstraStubPage = lazy(() => import('@/pages/AstraStubPage').then((m) => ({ default: m.AstraStubPage })));
const ConstellationPage = lazy(() => import('@/pages/ConstellationPage').then((m) => ({ default: m.ConstellationPage })));
const BlingsPage = lazy(() => import('@/pages/BlingsPage').then((m) => ({ default: m.BlingsPage })));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const BusinessPage = lazy(() => import('@/pages/BusinessPage').then((m) => ({ default: m.BusinessPage })));
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const CollectionsIndexPage = lazy(() => import('@/pages/CollectionsIndexPage').then((m) => ({ default: m.CollectionsIndexPage })));
import { ComingSoonPage } from '@/pages/ComingSoonPage';
const HandleSettingsPage = lazy(() => import('@/pages/HandleSettingsPage').then((m) => ({ default: m.HandleSettingsPage })));
const PatchboardSettingsPage = lazy(() => import('@/pages/PatchboardSettingsPage').then((m) => ({ default: m.PatchboardSettingsPage })));
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
import { LoginPage } from '@/pages/LoginPage';
const ManualPage = lazy(() => import('@/pages/ManualPage').then((m) => ({ default: m.ManualPage })));
const MyHexPage = lazy(() => import('@/pages/MyHexPage').then((m) => ({ default: m.MyHexPage })));
const NexusPage = lazy(() => import('@/pages/NexusPage').then((m) => ({ default: m.NexusPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const NucleusPage = lazy(() => import('@/pages/NucleusPage').then((m) => ({ default: m.NucleusPage })));
const PremiumPage = lazy(() => import('@/pages/PremiumPage').then((m) => ({ default: m.PremiumPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const RealmFeedPage = lazy(() => import('@/pages/RealmFeedPage').then((m) => ({ default: m.RealmFeedPage })));
const StudioPage = lazy(() => import('@/pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const SecurityPage = lazy(() => import('@/pages/SecurityPage').then((m) => ({ default: m.SecurityPage })));
const SurfacePage = lazy(() => import('@/pages/SurfacePage').then((m) => ({ default: m.SurfacePage })));
const WavesPage = lazy(() => import('@/pages/WavesPage').then((m) => ({ default: m.WavesPage })));
const BazaarBrowse = lazy(() => import('@/pages/bazaar/BazaarBrowse').then((m) => ({ default: m.BazaarBrowse })));
const BazaarListingDetail = lazy(() => import('@/pages/bazaar/BazaarListingDetail').then((m) => ({ default: m.BazaarListingDetail })));
const BazaarNew = lazy(() => import('@/pages/bazaar/BazaarNew').then((m) => ({ default: m.BazaarNew })));
const BazaarOrders = lazy(() => import('@/pages/bazaar/BazaarOrders').then((m) => ({ default: m.BazaarOrders })));
const CommsPage = lazy(() => import('@/pages/comms/CommsPage').then((m) => ({ default: m.CommsPage })));
const CommunityLayout = lazy(() => import('@/pages/community/CommunityLayout').then((m) => ({ default: m.CommunityLayout })));
const AtlasOraclePage = lazy(() => import('@/pages/dingleberry/AtlasOraclePage').then((m) => ({ default: m.AtlasOraclePage })));
const CommandCenterPage = lazy(() => import('@/pages/dingleberry/CommandCenterPage').then((m) => ({ default: m.CommandCenterPage })));
const DingleberryLayout = lazy(() => import('@/pages/dingleberry/DingleberryLayout').then((m) => ({ default: m.DingleberryLayout })));
const DispatchAuthPage = lazy(() => import('@/pages/dingleberry/DispatchAuthPage').then((m) => ({ default: m.DispatchAuthPage })));
const GoDarkMonitorPage = lazy(() => import('@/pages/dingleberry/GoDarkMonitorPage').then((m) => ({ default: m.GoDarkMonitorPage })));
const InfraHealthPage = lazy(() => import('@/pages/dingleberry/InfraHealthPage').then((m) => ({ default: m.InfraHealthPage })));
const JusticeHandoffPage = lazy(() => import('@/pages/dingleberry/JusticeHandoffPage').then((m) => ({ default: m.JusticeHandoffPage })));
const KarmaCreditPage = lazy(() => import('@/pages/dingleberry/KarmaCreditPage').then((m) => ({ default: m.KarmaCreditPage })));
const MemberMeshPage = lazy(() => import('@/pages/dingleberry/MemberMeshPage').then((m) => ({ default: m.MemberMeshPage })));
const PostureBoardPage = lazy(() => import('@/pages/dingleberry/PostureBoardPage').then((m) => ({ default: m.PostureBoardPage })));
const ShillDetectionPage = lazy(() => import('@/pages/dingleberry/ShillDetectionPage').then((m) => ({ default: m.ShillDetectionPage })));
const SourceVerificationPage = lazy(() => import('@/pages/dingleberry/SourceVerificationPage').then((m) => ({ default: m.SourceVerificationPage })));
const ThreatInterceptionPage = lazy(() => import('@/pages/dingleberry/ThreatInterceptionPage').then((m) => ({ default: m.ThreatInterceptionPage })));
const TransactionSecurityPage = lazy(() => import('@/pages/dingleberry/TransactionSecurityPage').then((m) => ({ default: m.TransactionSecurityPage })));
const EventPage = lazy(() => import('@/pages/events/EventPage').then((m) => ({ default: m.EventPage })));
const EventsPage = lazy(() => import('@/pages/events/EventsPage').then((m) => ({ default: m.EventsPage })));
const BalancePage = lazy(() => import('@/pages/freedomblings/BalancePage').then((m) => ({ default: m.BalancePage })));
const CharterPage = lazy(() => import('@/pages/freedomblings/CharterPage').then((m) => ({ default: m.CharterPage })));
const CirculationPage = lazy(() => import('@/pages/freedomblings/CirculationPage').then((m) => ({ default: m.CirculationPage })));
const EarningPage = lazy(() => import('@/pages/freedomblings/EarningPage').then((m) => ({ default: m.EarningPage })));
// deferred → Sep build (EscrowPage.tsx + escrow.ts stay on disk, just unrouted)
// const EscrowPage = lazy(() => import('@/pages/freedomblings/EscrowPage').then((m) => ({ default: m.EscrowPage })));
const FreedomblingsLayout = lazy(() => import('@/pages/freedomblings/FreedomblingsLayout').then((m) => ({ default: m.FreedomblingsLayout })));
const GradationsPage = lazy(() => import('@/pages/freedomblings/GradationsPage').then((m) => ({ default: m.GradationsPage })));
const LedgerPage = lazy(() => import('@/pages/freedomblings/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const LineagePage = lazy(() => import('@/pages/freedomblings/LineagePage').then((m) => ({ default: m.LineagePage })));
const MovePage = lazy(() => import('@/pages/freedomblings/MovePage').then((m) => ({ default: m.MovePage })));
const OpenBooksPage = lazy(() => import('@/pages/freedomblings/OpenBooksPage').then((m) => ({ default: m.OpenBooksPage })));
const StandingPage = lazy(() => import('@/pages/freedomblings/StandingPage').then((m) => ({ default: m.StandingPage })));
const CampaignPage = lazy(() => import('@/pages/give/CampaignPage').then((m) => ({ default: m.CampaignPage })));
const GivePage = lazy(() => import('@/pages/give/GivePage').then((m) => ({ default: m.GivePage })));
const GroupPage = lazy(() => import('@/pages/groups/GroupPage').then((m) => ({ default: m.GroupPage })));
const GroupsPage = lazy(() => import('@/pages/groups/GroupsPage').then((m) => ({ default: m.GroupsPage })));
const IntelPage = lazy(() => import('@/pages/intel/IntelPage').then((m) => ({ default: m.IntelPage })));
const NewThreadPage = lazy(() => import('@/pages/intel/NewThreadPage').then((m) => ({ default: m.NewThreadPage })));
const ReportedPage = lazy(() => import('@/pages/intel/ReportedPage').then((m) => ({ default: m.ReportedPage })));
const ThreadPage = lazy(() => import('@/pages/intel/ThreadPage').then((m) => ({ default: m.ThreadPage })));
// AtlasOracle console (the AI Astra). Distinct from AtlasOraclePage above,
// which is the DingleBERRY security-copilot demo screen at /dingleberry/oracle.
const OraclePage = lazy(() => import('@/pages/oracle/OraclePage').then((m) => ({ default: m.OraclePage })));
// /mc — build-progress board (OPS34). Admin-only and READ-ONLY: spawning stays
// in local mission control. Lazy so the rail types never reach a patron bundle.
const MissionControlPage = lazy(() => import('@/pages/MissionControlPage'));
const ChannelPage = lazy(() => import('@/pages/pulse/ChannelPage').then((m) => ({ default: m.ChannelPage })));
const PulseHome = lazy(() => import('@/pages/pulse/PulseHome').then((m) => ({ default: m.PulseHome })));
const WatchPage = lazy(() => import('@/pages/pulse/WatchPage').then((m) => ({ default: m.WatchPage })));
const NovaPage = lazy(() => import('@/pages/nova/NovaPage').then((m) => ({ default: m.NovaPage })));
const BrandosophicLayout = lazy(() => import('@/pages/brandosophic/BrandosophicLayout').then((m) => ({ default: m.BrandosophicLayout })));
const BrandosophicStudioPage = lazy(() => import('@/pages/brandosophic/BrandosophicStudioPage').then((m) => ({ default: m.BrandosophicStudioPage })));
const BrandosophicBrandsPage = lazy(() => import('@/pages/brandosophic/BrandosophicBrandsPage').then((m) => ({ default: m.BrandosophicBrandsPage })));
const BrandosophicNovasPage = lazy(() => import('@/pages/brandosophic/BrandosophicNovasPage').then((m) => ({ default: m.BrandosophicNovasPage })));
const BrandosophicStorefrontPage = lazy(() => import('@/pages/brandosophic/BrandosophicStorefrontPage').then((m) => ({ default: m.BrandosophicStorefrontPage })));
const ComparePage = lazy(() => import('@/pages/studio/ComparePage').then((m) => ({ default: m.ComparePage })));
const QrPage = lazy(() => import('@/pages/studio/QrPage').then((m) => ({ default: m.QrPage })));
const ImageEditorPage = lazy(() => import('@/pages/studio/ImageEditorPage').then((m) => ({ default: m.ImageEditorPage })));
const ResponseRecorderPage = lazy(() => import('@/pages/studio/ResponseRecorderPage').then((m) => ({ default: m.ResponseRecorderPage })));
const VideoEditorPage = lazy(() => import('@/pages/studio/VideoEditorPage').then((m) => ({ default: m.VideoEditorPage })));

export default function App() {
  return (
    <AuthProvider>
      <AstraProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </AstraProvider>
    </AuthProvider>
  );
}

const ADMIN_SURFACE_PATHS = new Set(['/myhex', '/nexus', '/nucleus']);

// Community surfaces own the white X-style shell (logo + lens controls live in
// the GlobalSidebar), so the global SiteHeader / ticker / toolbar are suppressed
// here — the shell renders its own ticker. Other surfaces keep the legacy chrome.
const COMMUNITY_PREFIXES = [
  '/brand',
  '/intel',
  '/unite',
  '/rule',
  // FUND (was GiVE) — the surface moved to /fund per FUND_MF v0.1. '/give' is
  // NOT listed: it no longer renders a page, it redirects to /fund.
  '/fund',
  '/pulse',
  '/bazaar',
  '/comms',
  '/security',
  // Sidebar utility-tail surfaces — same white shell, no skin switch.
  '/account',
  '/bookmarks',
  '/notifications',
  '/studio',
  '/premium',
  '/business',
  '/promotion',
  '/settings',
];

// Chrome-free paths — the front door (login / coming-soon), MiniWaves (V77),
// /h24, and /mc, which wear their OWN shell. No shared Manual SiteHeader / ticker.
// FRONTHDR1 (ORACLE_MF v1.61 R2): the pre-h24 Manual SiteHeader was rendering on
// /h24 in addition to the h24 chrome; /h24 now shows only its own toolbar +
// sidebar + console (the Rooms button moved into the h24 toolbar).
// FRONTHDR2 (owner ruling 2026-08-19): the shared SiteHeader was rendering on the
// /mc mission-control board too; /mc now shows only its own board chrome (the
// "Mission Control — build progress" header + the dispatch-queue board).
const CHROME_FREE_PATHS = new Set(['/', '/waves', '/miniwaves', '/h24', '/mc']);

// Management allowlist — OG HUMAN only, until the role registries (Lock 8 /
// 9.6) deploy and real tier checks replace this. Landing gate 2026-07-10.
const OG_HANDLES = new Set(['fnulnu']);

// OGOnly (handle-allowlist route gate) removed 2026-07-16 — /hq now relies on
// HQControlRoom's own bees.is_admin gate. OG_HANDLES below still drives the
// front-door management redirect only.

/** Post-login router for allowlisted Bees — directs by security level.
 *  Keyholder → Nucleus, property owner → Nexus, else MiniWaves (the OG
 *  daily driver). Both role flags fail-soft to false until the registries +
 *  check-keyholder deploy (Lock 8 / 9.6), so today OG lands in MiniWaves;
 *  the cascade upgrades itself automatically when real tiers go live. */
function ManagementRedirect() {
  const { role, loading } = useUserRole();
  if (loading) return null;
  if (role.isKeyholder) return <Navigate to="/nucleus" replace />;
  if (role.isPropertyOwner) return <Navigate to="/nexus" replace />;
  return <Navigate to="/miniwaves" replace />;
}

function AppContent() {
  const activeAstra = useAstra();
  const { bee, loading: authLoading } = useAuth();
  const location = useLocation();
  // Modal-route popups (astra-popups Wave 1): ModalLink stashes the origin
  // location as `background` in history state. When present, the base
  // <Routes> keeps rendering the origin surface and the matched popup route
  // renders in an overlay (RouteModal) — every popup keeps a shareable
  // canonical URL; a direct hit renders the same route full-page.
  const background = (location.state as { background?: Location } | null)?.background ?? null;
  // Chrome flags follow the SURFACE THE BEE SEES (the background when a
  // popup is open), not the popup's own path.
  const pathname = background?.pathname ?? location.pathname;

  // Platform branding (HQ-editable): one load per session; also swaps the
  // favicon to the configured mark.
  useEffect(() => {
    void useBranding.getState().load();
  }, []);
  const isAdminSurface = ADMIN_SURFACE_PATHS.has(pathname);
  const isCommunitySurface = COMMUNITY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  // /n/:slug Nova portals are chrome-free — each renders its own skinned world.
  const isChromeFree = CHROME_FREE_PATHS.has(pathname) || pathname.startsWith('/n/');
  const hideGlobalChrome = isAdminSurface || isCommunitySurface || isChromeFree;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-text">
      {!isCommunitySurface && !isChromeFree && <SiteHeader />}
      {/* Phase C Component D: top-ticker promotion slot below header.
          Hides itself when no DB match + no astra fallback (D-4).
          Suppressed on admin + community surfaces — they own their own chrome. */}
      {!hideGlobalChrome && <TopTickerSlot />}
      {/* Top Top toolbar (Search/Location/Time/Realm + breadcrumb strip)
          removed from the black shell 2026-07-16 (Butch) — component file
          kept (src/components/layout/TopToolbar.tsx); re-add the render here
          to restore. The white community shell keeps its own LensRow. */}
      {/* Single content region below the fixed header cluster. Platform surfaces
          size to h-full and own their internal scroll (one scrollbar); tall
          standalone pages scroll here. min-h-0 lets inner scrollers engage. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={null}>
        <Routes location={background ?? location}>
          {/* Front door (landing gate 2026-07-10) — astra-aware first, then:
            anonymous → login module · allowlisted OG → management (by
            security level) · any other signed-in Bee → blank coming soon. */}
          <Route
            path="/"
            element={
              activeAstra ? (
                <Navigate to={`/${activeAstra.primarySurface}`} replace />
              ) : authLoading ? null : !bee ? (
                <LoginPage />
              ) : OG_HANDLES.has(bee.handle) ? (
                <ManagementRedirect />
              ) : (
                <ComingSoonPage />
              )
            }
          />
          {/* Old anonymous homepage — parked, reachable, off the front door. */}
          <Route path="/home" element={<HomePage />} />

          {/* Admin tier surfaces (My Hex / Nexus / Nucleus) — outside
            PlatformLayout because they own their own chrome. */}
          <Route path="/myhex" element={<MyHexPage />} />
          <Route path="/nexus" element={<NexusPage />} />
          <Route path="/nucleus" element={<NucleusPage />} />

          {/* MiniWaves (V77) — chrome-free, owns its own shell. No SiteHeader,
            no toolbar, no breadcrumbs. /miniwaves is the Astra-named path,
            /waves the legacy alias; also reachable via the Tasks launcher
            popup in the community bottom toolbar. */}
          <Route path="/waves" element={<WavesPage />} />
          <Route path="/miniwaves" element={<WavesPage />} />

          {/* h24 — chrome-free, owns its own shell (FRONTHDR1, ORACLE_MF v1.61 R2).
            Moved OUT of PlatformLayout so no shared Manual SiteHeader/ticker/promo
            rail renders over it; OraclePage carries the h24 toolbar + sidebar +
            console. /oracle and /here24 still redirect here (below). */}
          <Route path="/h24" element={<OraclePage />} />

          {/* Mission Control board — chrome-free, owns its own board chrome
            (FRONTHDR2, owner ruling 2026-08-19). Moved OUT of PlatformLayout so no
            shared Manual SiteHeader / ticker / promo rail renders over it; the page
            carries its own "build progress" header + the dispatch-queue board.
            Gates on bees.is_admin, with the real enforcement being RLS on the ops_
            tables. A static path always out-ranks the PlatformLayout /:slug route,
            so this stays ahead of SurfacePage without living inside that group. */}
          <Route path="/mc" element={<MissionControlPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Premium handle claims (SINK 1) moved into the community shell —
            see the utility-tail routes inside CommunityLayout below. */}
          {/* /bees/me — owner-profile alias → canonical /profile. Public
            /bees/:handle is deferred pending a bees-RLS migration (email +
            bling_balance are anon-readable; see feat/profile-public-view notes). */}
          <Route path="/bees/me" element={<Navigate to="/profile" replace />} />

          {/* Nova portals — /n/:slug, chrome-free, each wearing its own skin.
            Public resolution via nova_resolve (SECDEF); Birth Certificate in
            the footer. Block 2, 2026-07-24. */}
          <Route path="/n/:slug" element={<NovaPage />} />

          {/* BRANDoSOPHIC — the brand-design Astra (MMF §25). Same white shell
            family, its own menu set (Studio / Brands / Novas / Storefront /
            Order Book). brandosophic.com resolves here via the astra registry;
            /brandosophic works on any host. 2026-07-24. */}
          <Route element={<BrandosophicLayout />}>
            <Route path="/brand" element={<BrandosophicStudioPage />} />
            <Route path="/brand/brands" element={<BrandosophicBrandsPage />} />
            <Route path="/brand/novas" element={<BrandosophicNovasPage />} />
            <Route path="/brand/storefront" element={<BrandosophicStorefrontPage />} />
          </Route>
          {/* Legacy alias — /brandosophic predates the /brand rename (Jul 24). */}
          <Route path="/brandosophic/*" element={<Navigate to="/brand" replace />} />

          {/* Community surfaces — ONE persistent white X-style shell (global
            sidebar + center scroller + cross-Astra right rail) mounted as a
            layout route. Surfaces are flat children so the shell never unmounts
            on navigation; only the center <Outlet/> swaps. */}
          <Route element={<CommunityLayout />}>
            <Route path="/intel" element={<IntelPage />} />
            <Route path="/intel/mine" element={<IntelPage />} />
            <Route path="/intel/saved" element={<IntelPage />} />
            <Route path="/intel/new" element={<NewThreadPage />} />
            <Route path="/intel/t/:threadId" element={<ThreadPage />} />
            <Route path="/intel/reported" element={<ReportedPage />} />
            <Route path="/unite" element={<GroupsPage />} />
            <Route path="/unite/:slug" element={<GroupPage />} />
            <Route path="/rule" element={<EventsPage />} />
            <Route path="/rule/:id" element={<EventPage />} />
            {/* FUND — renamed from GiVE (FUND_MF v0.1, 2026-08-17). The page
              components still live under pages/give/ and keep their Give*
              identifiers; only the URL and the visible copy move. The old
              /give URLs redirect (below, outside this layout route). */}
            <Route path="/fund" element={<GivePage />} />
            <Route path="/fund/:slug" element={<CampaignPage />} />

            {/* COMMS — Bee-to-Bee DMs + groups (v1 text layer, 2026-07-10).
              Backend RPCs were already deployed; this is their first UI.
              /comms/:conversationId matches the deep link comms_send writes
              into notifications. Rooms + roulette gated on LiveKit. */}
            <Route path="/comms" element={<CommsPage />} />
            <Route path="/comms/:conversationId" element={<CommsPage />} />

            {/* PULSE — Live News Network. Mounts in the SAME community shell as
              INTEL/UNITE/RULE/GIVE (sidebar + new header + single RealmStrip);
              pages are flat children so the shell never unmounts. The realm
              filter reads the shared lens (useLensStore.path) that the shell's
              RealmStrip drives. */}
            <Route path="/pulse" element={<PulseHome />} />
            <Route path="/pulse/watch/:broadcastId" element={<WatchPage />} />
            <Route path="/pulse/c/:handle" element={<ChannelPage />} />

            {/* Security — the device immune system. Owner ruling 2026-08-08:
              this belongs in the COMMUNITY shell, not the platform one, so the
              sidebar/toolbar never unmount when a Bee steps into it. The page
              content stays dark by design — it reads as its own console inside
              the white shell. Backed by the dingleberry_device_v1 rail. */}
            <Route path="/security" element={<SecurityPage />} />

            {/* BAZAAR — marketplace. Mounts in the same community shell; flat
              children. (new / orders land in later slices.) */}
            <Route path="/bazaar" element={<BazaarBrowse />} />
            <Route path="/bazaar/new" element={<BazaarNew />} />
            <Route path="/bazaar/orders" element={<BazaarOrders />} />
            <Route path="/bazaar/:id" element={<BazaarListingDetail />} />

            {/* Sidebar utility-tail surfaces (Intel menu completion 2026-07-16):
              Notifications, Creators Studio (Workshop section), Premium
              (ad-relief ladder), Business (org hub). They live INSIDE the
              white community shell — no skin switch when navigating the tail. */}
            {/* ACCOUNT hub (PROFILE1) — the @user account home: profile, wallet,
              orders, sales, memberships, activity, settings. One legible surface
              inside the same white shell (account surface in CommunityLayout).
              The toolbar avatar + the sidebar Account item open it. */}
            <Route path="/account" element={<AccountHubPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/studio" element={<StudioPage />} />
            {/* Creator Studio editors — full-page tools inside the same shell.
              :assetId = library asset, or "new" (blank canvas, ?w=&h=). */}
            <Route path="/studio/edit/image/:assetId" element={<ImageEditorPage />} />
            <Route path="/studio/edit/video/:assetId" element={<VideoEditorPage />} />
            <Route path="/studio/record" element={<ResponseRecorderPage />} />
            <Route path="/studio/compare" element={<ComparePage />} />
            <Route path="/studio/qr" element={<QrPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/promotion" element={<AdvertisePage />} />
            <Route path="/settings/handle" element={<HandleSettingsPage />} />
            {/* PATCHBOARD1 — the Bee-scope Patchboard (MMF §36): soft/hard
              switches + Connected Accounts. Platform-wide surface; per-Astra
              overrides render contextually inside an Astra. Master/Astra scope
              admin lives in HQ (#patchboard). */}
            <Route path="/settings/patchboard" element={<PatchboardSettingsPage />} />
          </Route>

          {/* Platform surfaces (right rail + utility chrome) */}
          <Route element={<PlatformLayout />}>
            {/* Manual surface */}
            <Route path="/manual" element={<ManualPage />} />

            {/* Connector collections — cross-cutting gatherings of atoms.
              Registered before /:slug so the explicit tree wins over the
              generic SurfacePage. */}
            <Route path="/collections" element={<CollectionsIndexPage />} />
            <Route path="/collection/:slug" element={<CollectionPage />} />

            {/* Cross-Astra realm lens feed (dispatch Part B). Picking a realm in
              the Top Top toolbar routes here; feed = forum_threads for the
              realm across all parent_surface, filtered by the Source chips. */}
            <Route path="/realm/:realmId" element={<RealmFeedPage />} />

            {/* DingleBERRY surface (SECURITY Astra) — Command Center + drills share
              DingleberryLayout (own left sidebar persists across screens). STEP-2
              port: overview is fully ported; drill screens render honest mock
              placeholders until slices B+ land. Registered before /:slug so the
              explicit tree wins over the generic SurfacePage, exactly like /intel. */}
            <Route path="/dingleberry" element={<DingleberryLayout />}>
              <Route index element={<CommandCenterPage />} />
              {/* FRONT28 — DB32's platform posture scan, database-only. */}
              <Route path="posture" element={<PostureBoardPage />} />
              <Route path="infra" element={<InfraHealthPage />} />
              <Route path="txn" element={<TransactionSecurityPage />} />
              <Route path="source" element={<SourceVerificationPage />} />
              <Route path="shill" element={<ShillDetectionPage />} />
              <Route path="dispatch" element={<DispatchAuthPage />} />
              <Route path="threat" element={<ThreatInterceptionPage />} />
              <Route path="mesh" element={<MemberMeshPage />} />
              <Route path="karma" element={<KarmaCreditPage />} />
              <Route path="godark" element={<GoDarkMonitorPage />} />
              <Route path="oracle" element={<AtlasOraclePage />} />
              <Route path="justice" element={<JusticeHandoffPage />} />
            </Route>

            {/* FreedomBLiNGS — The Sovereign Ledger (Currency). Staged port; Slice 1
              ships the LIVE Balance surface. Registered before /:slug so the
              explicit tree wins over the generic SurfacePage, exactly like
              /dingleberry. */}
            <Route path="/freedomblings" element={<FreedomblingsLayout />}>
              <Route index element={<BalancePage />} />
              <Route path="earning" element={<EarningPage />} />
              <Route path="circulation" element={<CirculationPage />} />
              <Route path="charter" element={<CharterPage />} />
              {/* deferred → Sep build
            <Route path="escrow" element={<EscrowPage />} /> */}
              <Route path="ledger" element={<LedgerPage />} />
              <Route path="openbooks" element={<OpenBooksPage />} />
              <Route path="move" element={<MovePage />} />
              <Route path="standing" element={<StandingPage />} />
              <Route path="lineage" element={<LineagePage />} />
              <Route path="gradations" element={<GradationsPage />} />
            </Route>

            {/* BLiNG! surface — freedomblings.com embedded via iframe.
              Per manual-spine-api-v1.md §3, /bling is a canonical universal
              path. The iframe wrapper IS the v1 implementation; replacing
              with a placeholder would regress functionality. When
              FreedomBLiNGs ships as a first-class registered Astra, a real
              BlingWallet component replaces the iframe here. */}
            <Route path="/bling" element={<BlingsPage />} />

            {/* Cross-Astra universal utility routes (per manual-spine-api-v1.md §3).
              These resolve identically from any host; AstraConfig provides
              theming via useAstra(). MUST be registered BEFORE the /:slug
              catch-all or react-router-dom will match them as Astra surfaces. */}
            {/* HQ gates itself on bees.is_admin (the same authority the DB's
              is_platform_admin() uses) — the old OGOnly handle-allowlist
              wrapper contradicted it (fnulnu hardcoded vs is_admin on the
              actual admin Bee) and made /hq unreachable. Removed 2026-07-16. */}
            <Route path="/hq" element={<HQControlRoom />} />
            {/* Legacy path for the AI Astra console. MUST stay ahead of /:slug
              or the catch-all SurfacePage swallows it. Not to be confused with
              /dingleberry/oracle, which is the DingleBERRY copilot demo.
              FRONT77 (ORACLE_MF v1.35): demoted from a peer render to a
              redirect — /h24 is the one home, so an old link lands there and
              the address bar says so. */}
            <Route path="/oracle" element={<Navigate to="/h24" replace />} />
            {/* h24 / here24 — the SAME Astra as /oracle (ORACLE_MF v1.22:
              "here24 = AtlasOracle rebranded — the engine, not the successor
              universe"), so it renders the same console rather than a second
              one. FRONT21 choice, recorded: /h24 is CANONICAL — it is the form
              the owner used when the Astra was named ("we created h24") and it
              is what the header badge points at. /here24 and /oracle both
              REDIRECT here rather than render as peers (FRONT77); one room,
              one address. The domains here24.tech / h24.tech stay registered and DARK
              (v1.21 / v1.24) — this route is the only way in.
              FRONTHDR1: the /h24 RENDER route moved OUT of PlatformLayout to a
              top-level chrome-free route (above) so no Manual SiteHeader renders
              over it; these two remain as redirects into it. */}
            <Route path="/here24" element={<Navigate to="/h24" replace />} />

            {/* The constellation index — the full derived Astra set. */}
            <Route path="/constellation" element={<ConstellationPage />} />

            {/* One route per Astra that has no ported code yet. Generated from
              the catalog so the router can never drift from the list, and
              registered BEFORE /:slug so an Astra slug reaches its stub instead
              of SurfacePage's silent redirect to /manual. Astras whose `mount`
              is 'page' or 'surface' are excluded by ASTRA_STUB_ENTRIES — a real
              surface always wins over a stub. */}
            {ASTRA_STUB_ENTRIES.map((entry) => (
              <Route
                key={entry.slug}
                path={entry.route}
                element={<AstraStubPage entry={entry} />}
              />
            ))}
            {/* Mission Control (/mc) moved OUT of this group to a top-level
              chrome-free route (FRONTHDR2) — see near /h24 above. A static path
              out-ranks /:slug, so it still wins over SurfacePage from up there. */}
            <Route path="/groups" element={<ManualGroupsPlaceholder />} />
            <Route path="/cart" element={<CartPlaceholder />} />
            <Route path="/api/docs" element={<OpenAPIDocs />} />
            <Route path="/status" element={<StatusPage />} />

            {/* All other surfaces use generic SurfacePage */}
            <Route path="/:slug" element={<SurfacePage />} />
          </Route>

          {/* Legacy redirects: old /s/foo URLs → /foo */}
          <Route path="/s/:slug" element={<RedirectSlashS />} />

          {/* GiVE → FUND (FUND_MF v0.1). The SLUG IS PRESERVED: /give/foo lands
            on /fund/foo, not on the FUND index. These two routes are the
            CLIENT-side half only — an in-app <Link to="/give"> never touches
            the server, so it needs its own redirect. The permanent HTTP 301
            that search engines and bookmarks see is issued by the Express
            serving layer, which is the only place a real status code exists. */}
          <Route path="/give" element={<RedirectGiveToFund />} />
          <Route path="/give/*" element={<RedirectGiveToFund />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </Suspense>
        {/* Popup layer — mounts only when a background location is present.
            One <Route> per popup; each wraps the SAME page component its
            canonical URL renders full-page, so parity is structural.
            Bookmarked stays a navigation (IntelPage saved-mode rides the
            shell's store state) — its dedicated popup is a later slice. */}
        {background && (
          <Suspense fallback={null}>
          <Routes>
            <Route
              path="/bookmarks"
              element={
                <PopupRoute popupKey="bookmarks">
                  <BookmarksPage />
                </PopupRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PopupRoute popupKey="notifications">
                  <NotificationsPage />
                </PopupRoute>
              }
            />
            <Route
              path="/intel/reported"
              element={
                <PopupRoute popupKey="report">
                  <ReportedPage />
                </PopupRoute>
              }
            />
            <Route
              path="/studio"
              element={
                <PopupRoute popupKey="creators">
                  <StudioPage />
                </PopupRoute>
              }
            />
            <Route
              path="/premium"
              element={
                <PopupRoute popupKey="premium">
                  <PremiumPage />
                </PopupRoute>
              }
            />
            <Route
              path="/business"
              element={
                <PopupRoute popupKey="business">
                  <BusinessPage />
                </PopupRoute>
              }
            />
            <Route
              path="/promotion"
              element={
                <PopupRoute popupKey="advertising">
                  <AdvertisePage />
                </PopupRoute>
              }
            />
            <Route
              path="/settings/handle"
              element={
                <PopupRoute popupKey="settings">
                  <HandleSettingsPage />
                </PopupRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PopupRoute popupKey="profile">
                  <ProfilePage />
                </PopupRoute>
              }
            />
            <Route path="*" element={null} />
          </Routes>
          </Suspense>
        )}
      </div>
    </div>
  );
}

function RedirectSlashS() {
  const { pathname } = useLocation();
  const flat = pathname.replace(/^\/s\//, '/');
  return <Navigate to={flat} replace />;
}

/**
 * GiVE → FUND, slug preserved (FUND_MF v0.1). `replace` so the retired URL
 * never lands in history — a Back press from /fund/foo must not bounce off
 * /give/foo and redirect forward again.
 *
 * The anchored `^\/give` rewrite maps /give → /fund and /give/foo → /fund/foo
 * in one expression. Anchoring matters: an unanchored replace would also
 * rewrite a slug that happens to contain "give".
 */
function RedirectGiveToFund() {
  const { pathname, search, hash } = useLocation();
  const moved = pathname.replace(/^\/give/, '/fund');
  return <Navigate to={`${moved}${search}${hash}`} replace />;
}
