import { Navigate, Outlet } from 'react-router-dom';
import { homePathForRole } from '@/lib/roleLabels';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

type Props = {
  allow: UserRole[] | 'superAdmin';
  fallback?: string;
};

export function RequireRole({ allow, fallback }: Props) {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;

  if (allow === 'superAdmin') {
    if (!session.superAdmin) {
      return <Navigate to={fallback ?? homePathForRole(session.role)} replace />;
    }
    return <Outlet />;
  }

  if (!allow.includes(session.role)) {
    return <Navigate to={fallback ?? homePathForRole(session.role)} replace />;
  }

  return <Outlet />;
}
