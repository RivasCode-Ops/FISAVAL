import { useEffect, useMemo, useState } from 'react';
import type { OrdemServico, OsStatus, Vistoria } from '@/types';
import { PAINEL_MAP_LEGEND, PainelMap } from '@/components/PainelMap';
import {
  CHECKLIST_ITEMS,
  getKpis,
  getVistoriaForOs,
  homologar,
  listAllOrdens,
} from '@/services/fisavalService';

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'homologacao', label: 'Homologação' },
  { value: 'pendente_sync', label: 'Pendente sync' },
  { value: 'em_vistoria', label: 'Em vistoria' },
  { value: 'homologada', label: 'Homologada' },
  { value: 'interrompida', label: 'Interrompida' },
];

export function PainelPage() {
  const [kpis, setKpis] = useState({
    osHoje: 0,
    concluidas: 0,
    homolog: 0,
    divergencias: 0,
    fiscais: [] as { nome: string; id: string }[],
  });
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [homologQueue, setHomologQueue] = useState<OrdemServico[]>([]);
  const [vistorias, setVistorias] = useState<Record<string, Vistoria>>({});
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroFiscal, setFiltroFiscal] = useState('all');
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

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
    const queue = all.filter((o) => o.status === 'homologacao');
    setHomologQueue(queue);
    const vs: Record<string, Vistoria> = {};
    for (const o of queue) {
      const v = await getVistoriaForOs(o.id);
      if (v) vs[o.id] = v;
    }
    setVistorias(vs);
  }

  useEffect(() => {
    void reload();
  }, []);

  const fiscaisMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of ordens) m.set(o.fiscalId, o.fiscalNome);
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [ordens]);

  const ordensMapa = useMemo(() => {
    return ordens.filter((o) => {
      if (filtroStatus !== 'all' && o.status !== (filtroStatus as OsStatus)) return false;
      if (filtroFiscal !== 'all' && o.fiscalId !== filtroFiscal) return false;
      return true;
    });
  }, [ordens, filtroStatus, filtroFiscal]);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi">
          <strong>{kpis.osHoje}</strong>OS (ref.)
        </div>
        <div className="kpi">
          <strong>{kpis.concluidas}</strong>Em fluxo / ok
        </div>
        <div className="kpi">
          <strong>{kpis.homolog}</strong>Homolog. pend.
        </div>
        <div className="kpi">
          <strong>{kpis.divergencias}</strong>Divergências
        </div>
      </div>

      <div className="card">
        <h2>Mapa operacional</h2>
        <div className="map-filters">
          <label>
            Status
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              {STATUS_OPTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fiscal
            <select value={filtroFiscal} onChange={(e) => setFiltroFiscal(e.target.value)}>
              <option value="all">Todos</option>
              {fiscaisMap.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <span className="map-filters-count">
            {ordensMapa.length} OS no mapa
          </span>
        </div>
        <PainelMap
          ordens={ordensMapa}
          highlightId={destaqueId ?? undefined}
          onSelect={(o) => setDestaqueId(o.id)}
        />
        <ul className="map-legend">
          {PAINEL_MAP_LEGEND.map((item) => (
            <li key={item.className}>
              <span className={`painel-marker ${item.className}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Fiscais</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {kpis.fiscais.map((f) => (
                <tr key={f.id}>
                  <td>{f.nome}</td>
                  <td>{f.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Homologação cadastral</h2>
          {homologQueue.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Nenhuma vistoria aguardando.</p>
          ) : (
            homologQueue.map((o) => {
              const v = vistorias[o.id];
              const checks = v
                ? CHECKLIST_ITEMS.filter((c) => v.checklist[c.id]).map((c) => c.label)
                : [];
              return (
                <div
                  key={o.id}
                  style={{
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <strong>{o.id}</strong> — {o.inscricao}
                  <br />
                  <small>
                    {o.endereco} · {o.fiscalNome}
                  </small>
                  {v && (
                    <p style={{ fontSize: '0.85rem', margin: '0.35rem 0', color: 'var(--muted)' }}>
                      {v.divergencia ? (
                        <span className="badge b-pri-alta">Divergência</span>
                      ) : (
                        <span className="badge b-pri-baixa">Sem divergência</span>
                      )}
                      {checks.length > 0 && ` · ${checks.length} itens OK`}
                      {v.concluidaAt && ` · ${new Date(v.concluidaAt).toLocaleString('pt-BR')}`}
                    </p>
                  )}
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-ok"
                      onClick={() => void homologar(o.id, true).then(reload)}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => void homologar(o.id, false).then(reload)}
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <h2>Todas as ordens de serviço</h2>
        <table>
          <thead>
            <tr>
              <th>OS</th>
              <th>Fiscal</th>
              <th>Bairro</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr
                key={o.id}
                className={destaqueId === o.id ? 'row-highlight' : undefined}
                onClick={() => setDestaqueId(o.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>{o.id}</td>
                <td>{o.fiscalNome}</td>
                <td>{o.bairro}</td>
                <td>
                  <span className="badge b-status">{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
