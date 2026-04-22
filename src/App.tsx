import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { HomePage } from '@/pages/HomePage';
import { ManualPage } from '@/pages/ManualPage';
import { IntelPage } from '@/pages/intel/IntelPage';
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

          {/* Platform surfaces (sidebar wrapped) */}
          <Route element={<PlatformLayout />}>
            {/* MANUAL surface = full Manual renderer */}
            <Route path="/s/manual" element={<ManualPage />} />
            {/* INTEL surface = realm-based forum */}
            <Route path="/s/intel" element={<IntelPage />} />
            {/* All other surfaces use generic SurfacePage */}
            <Route path="/s/:slug" element={<SurfacePage />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/manual" element={<Navigate to="/s/manual" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
