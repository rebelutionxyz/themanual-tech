import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
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
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PlatformLayout } from '@/components/layout/PlatformLayout';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg text-text">
        <SiteHeader />
        <Routes>
          {/* Home */}
          <Route path="/" element={<HomePage />} />

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
      </div>
    </AuthProvider>
  );
}

function RedirectSlashS() {
  const { pathname } = useLocation();
  const flat = pathname.replace(/^\/s\//, '/');
  return <Navigate to={flat} replace />;
}
