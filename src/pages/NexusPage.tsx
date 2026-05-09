import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/admin/AdminLayout';
import { getSectionsForTier } from '@/admin/registry';
import { useUserRole } from '@/lib/useUserRole';

const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#F0F0F5';

export function NexusPage() {
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

  // Signed in but not a property owner — render the empty state inside the
  // Nexus chrome (silver content area) rather than redirecting away.
  if (!role.isPropertyOwner) {
    return (
      <AdminLayout
        tier="nexus"
        sections={[]}
        emptyState={
          <div
            className="mx-auto max-w-2xl rounded-lg p-6"
            style={{ background: PANEL_BG, color: TEXT_PRIMARY }}
          >
            <h1 className="font-display text-2xl font-semibold">
              No properties yet
            </h1>
            <p className="mt-3 text-sm">
              You don't own any properties yet. Visit the Workshop to clone an
              Astra into your first Nova.
            </p>
          </div>
        }
      />
    );
  }

  const sections = getSectionsForTier('nexus', role);
  return <AdminLayout tier="nexus" sections={sections} />;
}
