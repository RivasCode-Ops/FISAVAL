import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { isApiMode } from '@/api/config';
import { useAuthStore } from '@/store/authStore';

type Row = {
  tenantId: string;
  municipio: string;
  osHoje: number;
  concluidas: number;
  homolog: number;
  divergencias: number;
  visitasHoje: number;
  prazoVencido: number;
  fiscaisAtivos: number;
  emAlerta?: boolean;
};

type AlertaTenant = {
  tenantId: string;
  municipio: string;
  count: number;
  ordens: {
    id: string;
    fiscalNome: string;
    endereco: string;
    prazo: string;
    diasAtraso: number;
  }[];
};

export function SuperPainelPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [rows, setRows] = useState<Row[]>([]);
  const [alertas, setAlertas] = useState<AlertaTenant[]>([]);
  const [alertaTotal, setAlertaTotal] = useState(0);
  const [limiar, setLimiar] = useState(1);
  const [generatedAt, setGeneratedAt] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiMode() || !navigator.onLine) {
      setErro('Visão cross-tenant exige API online.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const [overview, prazo] = await Promise.all([
        apiClient.superOverview(),
        apiClient.superAlertasPrazo(),
      ]);
      setRows(overview.tenants);
      setGeneratedAt(overview.generatedAt);
      setAlertas(prazo.tenants);
      setAlertaTotal(prazo.total);
      setLimiar(prazo.limiar);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar visão global');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void reload();
  }, [isSuperAdmin, reload]);

  if (!isSuperAdmin) {
    return (
      <div className="card">
        <p>Acesso restrito a super-administradores (e-mail em SUPER_ADMIN_EMAILS com MULTI_TENANT).</p>
      </div>
    );
  }

  return (
    <>
      {alertaTotal > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            borderColor: 'var(--danger, #c44)',
            background: 'rgba(200, 60, 60, 0.08)',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--danger, #c44)' }}>
            Alerta cross-tenant — prazo vencido
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
            {alertaTotal} OS ativa(s) com prazo vencido em {alertas.length} prefeitura(s) (limiar ≥ {limiar}).
          </p>
          {alertas.map((t) => (
            <div key={t.tenantId} style={{ marginBottom: '1rem' }}>
              <strong>
                {t.municipio} (<code>{t.tenantId}</code>) — {t.count} OS
              </strong>
              <table style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Fiscal</th>
                    <th>Endereço</th>
                    <th>Prazo</th>
                    <th>Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {t.ordens.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{o.fiscalNome}</td>
                      <td>{o.endereco}</td>
                      <td>{o.prazo}</td>
                      <td>{o.diasAtraso} dia(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, flex: 1 }}>Visão global — prefeituras</h2>
          <button type="button" className="btn btn-sm" disabled={loading} onClick={() => void reload()}>
            {loading ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 0 }}>
          KPIs agregados por tenant. Linhas em destaque: prefeituras em alerta de prazo.
        </p>
        {erro && <p style={{ color: 'var(--danger, #c44)' }}>{erro}</p>}
        {generatedAt && (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Atualizado: {new Date(generatedAt).toLocaleString('pt-BR')}
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Município</th>
              <th>OS hoje</th>
              <th>Concl.</th>
              <th>Homolog.</th>
              <th>Diverg.</th>
              <th>Visitas hoje</th>
              <th>Prazo venc.</th>
              <th>Fiscais</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.tenantId}
                style={
                  r.emAlerta
                    ? { background: 'rgba(200, 60, 60, 0.1)' }
                    : undefined
                }
              >
                <td>
                  <code>{r.tenantId}</code>
                  {r.emAlerta && (
                    <span className="badge b-pri-alta" style={{ marginLeft: '0.35rem' }}>
                      alerta
                    </span>
                  )}
                </td>
                <td>{r.municipio}</td>
                <td>{r.osHoje}</td>
                <td>{r.concluidas}</td>
                <td>{r.homolog}</td>
                <td>{r.divergencias}</td>
                <td>{r.visitasHoje}</td>
                <td>{r.prazoVencido}</td>
                <td>{r.fiscaisAtivos}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ fontWeight: 600, background: 'var(--surface-2, rgba(0,0,0,0.04))' }}>
                <td colSpan={2}>Total</td>
                <td>{rows.reduce((s, r) => s + r.osHoje, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.concluidas, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.homolog, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.divergencias, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.visitasHoje, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.prazoVencido, 0)}</td>
                <td>{rows.reduce((s, r) => s + r.fiscaisAtivos, 0)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {!rows.length && !loading && !erro && <p style={{ color: 'var(--muted)' }}>Nenhum tenant cadastrado.</p>}
      </div>
    </>
  );
}
