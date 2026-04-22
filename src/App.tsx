import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { HomePage } from '@/pages/HomePage';
import { ManualPage } from '@/pages/ManualPage';
import { IntelPage } from '@/pages/intel/IntelPage';
import { NewThreadPage } from '@/pages/intel/NewThreadPage';
import { ThreadPage } from '@/pages/intel/ThreadPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SurfacePage } from '@/pages/SurfacePage';
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

          {/* INTEL sub-routes (NO platform sidebar wrap — composer/detail are focused views) */}
          <Route path="/intel/new" element={<NewThreadPage />} />
          <Route path="/intel/t/:threadId" element={<ThreadPage />} />

          {/* Platform surfaces (flat URLs, sidebar-wrapped) */}
          <Route element={<PlatformLayout />}>
            <Route path="/manual" element={<ManualPage />} />
            <Route path="/intel" element={<IntelPage />} />
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
