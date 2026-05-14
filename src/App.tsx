import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AstraProvider, useAstra } from '@/lib/astras/AstraContext';
import { HomePage } from '@/pages/HomePage';
import { ManualPage } from '@/pages/ManualPage';
import { IntelLayout } from '@/pages/intel/IntelLayout';
import { IntelPage } from '@/pages/intel/IntelPage';
import { NewThreadPage } from '@/pages/intel/NewThreadPage';
import { ThreadPage } from '@/pages/intel/ThreadPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SurfacePage } from '@/pages/SurfacePage';
import { WavesPage } from '@/pages/WavesPage';
import { BlingsPage } from '@/pages/BlingsPage';
import { MyHexPage } from '@/pages/MyHexPage';
import { NexusPage } from '@/pages/NexusPage';
import { NucleusPage } from '@/pages/NucleusPage';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { GeoLensBar } from '@/components/geo/GeoLensBar';
import { TopTickerSlot } from '@/components/promotions/TopTickerSlot';

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

        {/* Platform surfaces (right rail + utility chrome) */}
        <Route element={<PlatformLayout />}>
          {/* Manual surface */}
          <Route path="/manual" element={<ManualPage />} />

          {/* INTEL surface + all sub-routes share the same IntelLayout
              (sidebar + realm bar persist across thread list, composer, detail) */}
          <Route path="/intel" element={<IntelLayout />}>
            <Route index element={<IntelPage />} />
            <Route path="mine" element={<IntelPage />} />
            <Route path="new" element={<NewThreadPage />} />
            <Route path="t/:threadId" element={<ThreadPage />} />
          </Route>

          {/* Waves surface — Mini Waves V76 embedded via iframe */}
          <Route path="/waves" element={<WavesPage />} />

          {/* BLiNG! surface — freedomblings.com embedded via iframe */}
          <Route path="/bling" element={<BlingsPage />} />

          {/* All other surfaces use generic SurfacePage */}
          <Route path="/:slug" element={<SurfacePage />} />
        </Route>

        {/* Legacy redirects: old /s/foo URLs → /foo */}
        <Route path="/s/:slug" element={<RedirectSlashS />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Phase C Component C: sticky bottom geo lens. Placed outside <Routes>
          so it survives navigation. Suppressed on admin surfaces (they own
          their own chrome). */}
      {!isAdminSurface && <GeoLensBar />}
    </div>
  );
}

function RedirectSlashS() {
  const { pathname } = useLocation();
  const flat = pathname.replace(/^\/s\//, '/');
  return <Navigate to={flat} replace />;
}
