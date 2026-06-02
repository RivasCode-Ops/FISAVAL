import { useEffect, useState } from 'react';
import type { OrdemServico } from '@/types';
import { getKpis, homologar, listAllOrdens } from '@/services/fisavalService';

export function PainelPage() {
  const [kpis, setKpis] = useState({ osHoje: 0, concluidas: 0, homolog: 0, divergencias: 0, fiscais: [] as { nome: string; id: string }[] });
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [homologQueue, setHomologQueue] = useState<OrdemServico[]>([]);

  async function reload() {
    const k = await getKpis();
    setKpis({
      osHoje: k.osHoje,
      concluidas: k.concluidas,
      homolog: k.homolog,
      divergencias: k.divergencias,
      fiscais: k.fiscais.map((f) => ({ id: f.id, nome: f.nome })),
    });
    const all = await listAllOrdens();
    setOrdens(all);
    setHomologQueue(all.filter((o) => o.status === 'homologacao'));
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><strong>{kpis.osHoje}</strong>OS (ref.)</div>
        <div className="kpi"><strong>{kpis.concluidas}</strong>Em fluxo / ok</div>
        <div className="kpi"><strong>{kpis.homolog}</strong>Homolog. pend.</div>
        <div className="kpi"><strong>{kpis.divergencias}</strong>Divergências</div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Fiscais</h2>
          <table>
            <thead><tr><th>Nome</th><th>ID</th></tr></thead>
            <tbody>
              {kpis.fiscais.map((f) => (
                <tr key={f.id}><td>{f.nome}</td><td>{f.id}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Homologação cadastral</h2>
          {homologQueue.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Nenhuma vistoria aguardando.</p>
          ) : (
            homologQueue.map((o) => (
              <div key={o.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <strong>{o.id}</strong> — {o.inscricao}
                <br />
                <small>{o.endereco} · {o.fiscalNome}</small>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-sm btn-ok" onClick={() => void homologar(o.id, true).then(reload)}>
                    Aprovar
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => void homologar(o.id, false).then(reload)}>
                    Devolver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h2>Todas as ordens de serviço</h2>
        <table>
          <thead>
            <tr><th>OS</th><th>Fiscal</th><th>Bairro</th><th>Status</th></tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.fiscalNome}</td>
                <td>{o.bairro}</td>
                <td><span className="badge b-status">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
