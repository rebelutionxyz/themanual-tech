import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/admin/AdminLayout';
import { getSectionsForTier } from '@/admin/registry';
import { useUserRole } from '@/lib/useUserRole';

export function MyHexPage() {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        style={{ background: '#0A1628' }}
      >
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  if (!role.isAuthenticated) return <Navigate to="/login" replace />;

  const sections = getSectionsForTier('my-hex', role);
  return <AdminLayout tier="my-hex" sections={sections} />;
}
