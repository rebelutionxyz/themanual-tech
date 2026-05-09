import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/admin/AdminLayout';
import { getSectionsForTier } from '@/admin/registry';
import { useUserRole } from '@/lib/useUserRole';

const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#F0F0F5';
const TEXT_MUTED = '#5A7BAA';

export function NucleusPage() {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        style={{ background: PANEL_BG }}
      >
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  if (!role.isAuthenticated) return <Navigate to="/login" replace />;

  if (!role.isKeyholder) {
    return (
      <AdminLayout
        tier="nucleus"
        sections={[]}
        emptyState={
          <div
            className="mx-auto max-w-2xl rounded-lg p-6"
            style={{ background: PANEL_BG, color: TEXT_PRIMARY }}
          >
            <h1 className="font-display text-2xl font-semibold">Restricted</h1>
            <p className="mt-3 text-sm">
              The Nucleus is restricted to the Five Keyholders.
            </p>
            <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
              See HONEYCOMB §31 — Three Switches & Five Keyholders.
            </p>
          </div>
        }
      />
    );
  }

  const sections = getSectionsForTier('nucleus', role);
  return <AdminLayout tier="nucleus" sections={sections} />;
}
