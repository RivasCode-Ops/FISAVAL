import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isApiMode } from '@/api/config';
import { useAuthStore } from '@/store/authStore';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useOnline } from '@/hooks/useOnline';
import { refreshFromServer } from '@/services/fisavalService';

export function Layout() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const hasRole = useAuthStore((s) => s.hasRole);
  const navigate = useNavigate();
  const online = useOnline();
  const { health, checking, check } = useApiHealth(60_000);
  const apiMode = isApiMode();

  async function onRefresh() {
    const ok = await refreshFromServer();
    if (ok) window.location.reload();
  }

  if (!session) return null;

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <h1>FISAVAL</h1>
          <span className="offline-pill" data-on={online ? 'true' : 'false'}>
            {online ? '● Online' : '○ Offline (dados locais)'}
          </span>
          {apiMode && (
            <span className="offline-pill api-pill" data-on={health?.ok ? 'true' : 'false'}>
              {checking ? '… API' : health?.ok ? `● API (${health.storage ?? 'ok'})` : '○ API indisponível'}
            </span>
          )}
        </div>
        <nav>
          {hasRole('gestor', 'admin') && (
            <>
              <NavLink to="/painel" end>Painel</NavLink>
              <NavLink to="/demandas">Demandas</NavLink>
            </>
          )}
          {hasRole('fiscal') && <NavLink to="/campo">Campo</NavLink>}
          {apiMode && hasRole('gestor', 'admin') && online && (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => void onRefresh()}>
              Atualizar servidor
            </button>
          )}
          {apiMode && (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => void check()} title="Testar API">
              ↻
            </button>
          )}
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
