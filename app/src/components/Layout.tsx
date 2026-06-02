import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOnline } from '@/hooks/useOnline';

export function Layout() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const hasRole = useAuthStore((s) => s.hasRole);
  const navigate = useNavigate();
  const online = useOnline();

  if (!session) return null;

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <h1>FISAVAL</h1>
          <span className="offline-pill" data-on={online ? 'true' : 'false'}>
            {online ? '● Online' : '○ Offline (dados locais)'}
          </span>
        </div>
        <nav>
          {hasRole('gestor', 'admin') && (
            <>
              <NavLink to="/painel" end>Painel</NavLink>
              <NavLink to="/demandas">Demandas</NavLink>
            </>
          )}
          {hasRole('fiscal') && <NavLink to="/campo">Campo</NavLink>}
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{session.nome}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sair
          </button>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
