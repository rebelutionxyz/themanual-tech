import { HQControlRoom } from '@/components/hq/HQControlRoom';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { TopTickerSlot } from '@/components/promotions/TopTickerSlot';
import {
  CartPlaceholder,
  CommsPlaceholder,
  ManualGroupsPlaceholder,
  NotificationCenter,
  OpenAPIDocs,
  StatusPage,
} from '@/components/universal/UniversalPlaceholders';
import { AstraProvider, useAstra } from '@/lib/astras/AstraContext';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BlingsPage } from '@/pages/BlingsPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { CollectionsIndexPage } from '@/pages/CollectionsIndexPage';
import { HandleSettingsPage } from '@/pages/HandleSettingsPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ManualPage } from '@/pages/ManualPage';
import { MyHexPage } from '@/pages/MyHexPage';
import { NexusPage } from '@/pages/NexusPage';
import { NucleusPage } from '@/pages/NucleusPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RealmFeedPage } from '@/pages/RealmFeedPage';
import { SurfacePage } from '@/pages/SurfacePage';
import { WavesPage } from '@/pages/WavesPage';
import { CommunityLayout } from '@/pages/community/CommunityLayout';
import { AtlasOraclePage } from '@/pages/dingleberry/AtlasOraclePage';
import { CommandCenterPage } from '@/pages/dingleberry/CommandCenterPage';
import { DingleberryLayout } from '@/pages/dingleberry/DingleberryLayout';
import { DispatchAuthPage } from '@/pages/dingleberry/DispatchAuthPage';
import { GoDarkMonitorPage } from '@/pages/dingleberry/GoDarkMonitorPage';
import { InfraHealthPage } from '@/pages/dingleberry/InfraHealthPage';
import { JusticeHandoffPage } from '@/pages/dingleberry/JusticeHandoffPage';
import { KarmaCreditPage } from '@/pages/dingleberry/KarmaCreditPage';
import { MemberMeshPage } from '@/pages/dingleberry/MemberMeshPage';
import { ShillDetectionPage } from '@/pages/dingleberry/ShillDetectionPage';
import { SourceVerificationPage } from '@/pages/dingleberry/SourceVerificationPage';
import { ThreatInterceptionPage } from '@/pages/dingleberry/ThreatInterceptionPage';
import { TransactionSecurityPage } from '@/pages/dingleberry/TransactionSecurityPage';
import { EventPage } from '@/pages/events/EventPage';
import { EventsPage } from '@/pages/events/EventsPage';
import { BalancePage } from '@/pages/freedomblings/BalancePage';
import { CharterPage } from '@/pages/freedomblings/CharterPage';
import { CirculationPage } from '@/pages/freedomblings/CirculationPage';
import { EarningPage } from '@/pages/freedomblings/EarningPage';
// deferred → Sep build (EscrowPage.tsx + escrow.ts stay on disk, just unrouted)
// import { EscrowPage } from '@/pages/freedomblings/EscrowPage';
import { FreedomblingsLayout } from '@/pages/freedomblings/FreedomblingsLayout';
import { GradationsPage } from '@/pages/freedomblings/GradationsPage';
import { LedgerPage } from '@/pages/freedomblings/LedgerPage';
import { LineagePage } from '@/pages/freedomblings/LineagePage';
import { MovePage } from '@/pages/freedomblings/MovePage';
import { OpenBooksPage } from '@/pages/freedomblings/OpenBooksPage';
import { StandingPage } from '@/pages/freedomblings/StandingPage';
import { GivePage } from '@/pages/give/GivePage';
import { GroupPage } from '@/pages/groups/GroupPage';
import { GroupsPage } from '@/pages/groups/GroupsPage';
import { IntelPage } from '@/pages/intel/IntelPage';
import { NewThreadPage } from '@/pages/intel/NewThreadPage';
import { ReportedPage } from '@/pages/intel/ReportedPage';
import { ThreadPage } from '@/pages/intel/ThreadPage';
import { BazaarBrowse } from '@/pages/bazaar/BazaarBrowse';
import { BazaarListingDetail } from '@/pages/bazaar/BazaarListingDetail';
import { BazaarNew } from '@/pages/bazaar/BazaarNew';
import { BazaarOrders } from '@/pages/bazaar/BazaarOrders';
import { ChannelPage } from '@/pages/pulse/ChannelPage';
import { PulseHome } from '@/pages/pulse/PulseHome';
import { WatchPage } from '@/pages/pulse/WatchPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUserRole } from '@/lib/useUserRole';

export default function App() {
  return (
    <AuthProvider>
      <AstraProvider>
        <AppContent />
      </AstraProvider>
    </AuthProvider>
  );
}

const ADMIN_SURFACE_PATHS = new Set(['/myhex', '/nexus', '/nucleus']);

// Community surfaces own the white X-style shell (logo + lens controls live in
// the GlobalSidebar), so the global SiteHeader / ticker / toolbar are suppressed
// here — the shell renders its own ticker. Other surfaces keep the legacy chrome.
const COMMUNITY_PREFIXES = ['/intel', '/unite', '/rule', '/give', '/pulse', '/bazaar'];

// Chrome-free paths — the front door (login / coming-soon) and MiniWaves,
// which owns its own shell (V77). No SiteHeader / ticker / toolbar.
const CHROME_FREE_PATHS = new Set(['/', '/waves', '/miniwaves']);

// Management allowlist — OG HUMAN only, until the role registries (Lock 8 /
// 9.6) deploy and real tier checks replace this. Landing gate 2026-07-10.
const OG_HANDLES = new Set(['fnulnu']);

/** Gate a route to allowlisted handles; everyone else → front door. */
function OGOnly({ children }: { children: ReactNode }) {
  const { bee, loading } = useAuth();
  if (loading) return null;
  if (!bee || !OG_HANDLES.has(bee.handle)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

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
  const { pathname } = useLocation();
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
      {/* Top Top toolbar — global platform chrome (dispatch A1). Identical on
          every surface; suppressed on admin + community surfaces. */}
      {!hideGlobalChrome && <TopToolbar />}
      {/* Single content region below the fixed header cluster. Platform surfaces
          size to h-full and own their internal scroll (one scrollbar); tall
          standalone pages scroll here. min-h-0 lets inner scrollers engage. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
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
          {/* Premium handle claims — SINK 1. Standalone (own <main>), inherits
            the global SiteHeader chrome like /profile. */}
          <Route path="/settings/handle" element={<HandleSettingsPage />} />
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
            <Route path="/intel/new" element={<NewThreadPage />} />
            <Route path="/intel/t/:threadId" element={<ThreadPage />} />
            <Route path="/intel/reported" element={<ReportedPage />} />
            <Route path="/unite" element={<GroupsPage />} />
            <Route path="/unite/:slug" element={<GroupPage />} />
            <Route path="/rule" element={<EventsPage />} />
            <Route path="/rule/:id" element={<EventPage />} />
            <Route path="/give" element={<GivePage />} />

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
            <Route
              path="/hq"
              element={
                <OGOnly>
                  <HQControlRoom />
                </OGOnly>
              }
            />
            <Route path="/groups" element={<ManualGroupsPlaceholder />} />
            <Route path="/comms" element={<CommsPlaceholder />} />
            <Route path="/notifications" element={<NotificationCenter />} />
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
      </div>
    </div>
  );
}

function RedirectSlashS() {
  const { pathname } = useLocation();
  const flat = pathname.replace(/^\/s\//, '/');
  return <Navigate to={flat} replace />;
}
