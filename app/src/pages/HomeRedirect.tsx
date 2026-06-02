import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function HomeRedirect() {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'fiscal') return <Navigate to="/campo" replace />;
  return <Navigate to="/painel" replace />;
}
