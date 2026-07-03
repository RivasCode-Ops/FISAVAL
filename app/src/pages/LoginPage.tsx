import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, isApiMode } from '@/api/config';
import { getStoredTenantId, setStoredTenantId } from '@/api/tenantStorage';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useAuthStore } from '@/store/authStore';
import { homePathForRole } from '@/lib/roleLabels';
import { setRuntimeTenantId } from '@/lib/tenantFilter';

type TenantOption = { id: string; municipio: string };

export function LoginPage() {
  const [email, setEmail] = useState('fiscal@demo');
  const [senha, setSenha] = useState('demo123');
  const [erro, setErro] = useState('');
  const [multiTenant, setMultiTenant] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState(
    () => getStoredTenantId() || (import.meta.env.VITE_TENANT_ID as string | undefined) || 'demo',
  );
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { health, checking } = useApiHealth();

  useEffect(() => {
    const base = getApiUrl();
    if (!base) return;
    void fetch(`${base}/api/fisaval/tenants`)
      .then((r) => r.json())
      .then((d: { multiTenant?: boolean; tenants?: TenantOption[]; defaultTenantId?: string }) => {
        setMultiTenant(!!d.multiTenant);
        const list = d.tenants ?? [];
        setTenants(list);
        if (!getStoredTenantId() && d.defaultTenantId) {
          setTenantId(d.defaultTenantId);
        }
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setStoredTenantId(tenantId);
    setRuntimeTenantId(tenantId);
    const ok = await login(email, senha);
    if (!ok) {
      setErro('E-mail ou senha inválidos.');
      return;
    }
    const session = useAuthStore.getState().session;
    if (session) navigate(homePathForRole(session.role));
  }

  return (
    <div className="login-page">
      <div className="login-box card">
        <h1 className="login-box__title">FISAVAL</h1>
        <p className="muted">Fiscalização imobiliária municipal</p>
        <form onSubmit={(e) => void onSubmit(e)} className="stack">
          {isApiMode() && (multiTenant || tenants.length > 1) && (
            <>
              <label>Prefeitura (tenant)</label>
              <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.municipio} ({t.id})
                  </option>
                ))}
                {!tenants.length && <option value={tenantId}>{tenantId}</option>}
              </select>
            </>
          )}
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
          {erro && <p className="text-danger">{erro}</p>}
          <button type="submit" className="btn btn-block">
            Entrar
          </button>
        </form>
        <div className="login-hint stack stack--sm">
          {isApiMode() && (
            <p>
              <strong>Modo servidor</strong> — {getApiUrl()}
              <br />
              {checking ? 'Verificando API…' : health?.ok ? `API OK (${health.storage})` : `API offline: ${health?.error ?? '—'}`}
              {multiTenant && (
                <>
                  <br />
                  Multi-tenant: envie <code>X-Tenant-Id</code> ({tenantId})
                </>
              )}
            </p>
          )}
          <p>
            <strong>gestor@demo</strong> / demo123 — <strong>Coordenador</strong> (Painel e Demandas)
          </p>
          <p>
            <strong>fiscal@demo</strong> / demo123 — <strong>Agente de campo</strong> (Campo)
          </p>
          <p>
            <strong>admin@demo</strong> / demo123 — <strong>Administrador</strong> (+ Auditoria e Administração)
          </p>
        </div>
      </div>
    </div>
  );
}
