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
const AdvertisePage = lazy(() => import('@/pages/AdvertisePage').then((m) => ({ default: m.AdvertisePage })));
const BlingsPage = lazy(() => import('@/pages/BlingsPage').then((m) => ({ default: m.BlingsPage })));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const BusinessPage = lazy(() => import('@/pages/BusinessPage').then((m) => ({ default: m.BusinessPage })));
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const CollectionsIndexPage = lazy(() => import('@/pages/CollectionsIndexPage').then((m) => ({ default: m.CollectionsIndexPage })));
import { ComingSoonPage } from '@/pages/ComingSoonPage';
const HandleSettingsPage = lazy(() => import('@/pages/HandleSettingsPage').then((m) => ({ default: m.HandleSettingsPage })));
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
const ChannelPage = lazy(() => import('@/pages/pulse/ChannelPage').then((m) => ({ default: m.ChannelPage })));
const PulseHome = lazy(() => import('@/pages/pulse/PulseHome').then((m) => ({ default: m.PulseHome })));
const WatchPage = lazy(() => import('@/pages/pulse/WatchPage').then((m) => ({ default: m.WatchPage })));
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
  '/intel',
  '/unite',
  '/rule',
  '/give',
  '/pulse',
  '/bazaar',
  '/comms',
  // Sidebar utility-tail surfaces — same white shell, no skin switch.
  '/bookmarks',
  '/notifications',
  '/studio',
  '/premium',
  '/business',
  '/promotion',
  '/settings',
];

// Chrome-free paths — the front door (login / coming-soon) and MiniWaves,
// which owns its own shell (V77). No SiteHeader / ticker / toolbar.
const CHROME_FREE_PATHS = new Set(['/', '/waves', '/miniwaves']);

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
  const isChromeFree = CHROME_FREE_PATHS.has(pathname);
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

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Premium handle claims (SINK 1) moved into the community shell —
            see the utility-tail routes inside CommunityLayout below. */}
          {/* /bees/me — owner-profile alias → canonical /profile. Public
            /bees/:handle is deferred pending a bees-RLS migration (email +
            bling_balance are anon-readable; see feat/profile-public-view notes). */}
          <Route path="/bees/me" element={<Navigate to="/profile" replace />} />

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
            <Route path="/give" element={<GivePage />} />
            <Route path="/give/:slug" element={<CampaignPage />} />

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
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/studio" element={<StudioPage />} />
            {/* Creator Studio editors — full-page tools inside the same shell.
              :assetId = library asset, or "new" (blank canvas, ?w=&h=). */}
            <Route path="/studio/edit/image/:assetId" element={<ImageEditorPage />} />
            <Route path="/studio/edit/video/:assetId" element={<VideoEditorPage />} />
            <Route path="/studio/record" element={<ResponseRecorderPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/promotion" element={<AdvertisePage />} />
            <Route path="/settings/handle" element={<HandleSettingsPage />} />
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
            <Route path="/groups" element={<ManualGroupsPlaceholder />} />
            <Route path="/cart" element={<CartPlaceholder />} />
            <Route path="/api/docs" element={<OpenAPIDocs />} />
            <Route path="/status" element={<StatusPage />} />

            {/* All other surfaces use generic SurfacePage */}
            <Route path="/:slug" element={<SurfacePage />} />
          </Route>

          {/* Legacy redirects: old /s/foo URLs → /foo */}
          <Route path="/s/:slug" element={<RedirectSlashS />} />

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
