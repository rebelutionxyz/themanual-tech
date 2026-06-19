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
import { IntelLayout } from '@/pages/intel/IntelLayout';
import { IntelPage } from '@/pages/intel/IntelPage';
import { NewThreadPage } from '@/pages/intel/NewThreadPage';
import { ThreadPage } from '@/pages/intel/ThreadPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

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

function AppContent() {
  const activeAstra = useAstra();
  const { bee, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const isAdminSurface = ADMIN_SURFACE_PATHS.has(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <SiteHeader />
      {/* Phase C Component D: top-ticker promotion slot below header.
          Hides itself when no DB match + no astra fallback (D-4).
          Suppressed on admin surfaces — they own their own chrome. */}
      {!isAdminSurface && <TopTickerSlot />}
      {/* Top Top toolbar — global platform chrome (dispatch A1). Identical on
          every surface; suppressed on admin surfaces (own their own chrome). */}
      {!isAdminSurface && <TopToolbar />}
      <Routes>
        {/* Home — astra-aware first, then admin tier-1 redirect for signed-in
            Bees on theMANUAL.tech root, then anonymous HomePage. */}
        <Route
          path="/"
          element={
            activeAstra ? (
              <Navigate to={`/${activeAstra.primarySurface}`} replace />
            ) : authLoading ? null : bee ? (
              <Navigate to="/myhex" replace />
            ) : (
              <HomePage />
            )
          }
        />

        {/* Admin tier surfaces (My Hex / Nexus / Nucleus) — outside
            PlatformLayout because they own their own chrome. */}
        <Route path="/myhex" element={<MyHexPage />} />
        <Route path="/nexus" element={<NexusPage />} />
        <Route path="/nucleus" element={<NucleusPage />} />

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

          {/* INTEL surface + all sub-routes share the same IntelLayout
              (sidebar + realm bar persist across thread list, composer, detail) */}
          <Route path="/intel" element={<IntelLayout />}>
            <Route index element={<IntelPage />} />
            <Route path="mine" element={<IntelPage />} />
            <Route path="new" element={<NewThreadPage />} />
            <Route path="t/:threadId" element={<ThreadPage />} />
          </Route>

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

          {/* Waves surface — Mini Waves V76 embedded via iframe */}
          <Route path="/waves" element={<WavesPage />} />

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
          <Route path="/hq" element={<HQControlRoom />} />
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
  );
}

function RedirectSlashS() {
  const { pathname } = useLocation();
  const flat = pathname.replace(/^\/s\//, '/');
  return <Navigate to={flat} replace />;
}
