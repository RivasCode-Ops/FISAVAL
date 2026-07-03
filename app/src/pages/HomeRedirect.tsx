import { Navigate } from 'react-router-dom';
import { homePathForRole } from '@/lib/roleLabels';
import { useAuthStore } from '@/store/authStore';

export function HomeRedirect() {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(session.role)} replace />;
}
