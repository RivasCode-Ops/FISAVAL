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
};

export function SuperPainelPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [rows, setRows] = useState<Row[]>([]);
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
      const data = await apiClient.superOverview();
      setRows(data.tenants);
      setGeneratedAt(data.generatedAt);
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
    <div className="card">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Visão global — prefeituras</h2>
        <button type="button" className="btn btn-sm" disabled={loading} onClick={() => void reload()}>
          {loading ? 'Carregando…' : 'Atualizar'}
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 0 }}>
        KPIs agregados por tenant (não altera o tenant ativo do seu login). Para operar uma prefeitura, escolha-a no login.
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
            <tr key={r.tenantId}>
              <td>
                <code>{r.tenantId}</code>
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
        </tbody>
      </table>
      {!rows.length && !loading && !erro && <p style={{ color: 'var(--muted)' }}>Nenhum tenant cadastrado.</p>}
    </div>
  );
}
