import { useCallback, useEffect, useMemo, useState } from 'react';
import { isApiMode } from '@/api/config';
import { downloadAuthenticatedCsv } from '@/lib/apiDownload';
import { useInterval } from '@/hooks/useInterval';
import { useOnline } from '@/hooks/useOnline';
import type { OrdemServico, OsStatus, Vistoria } from '@/types';
import { PAINEL_MAP_LEGEND, PainelMap } from '@/components/PainelMap';
import {
  buildOrdensCsvRows,
  downloadCsv,
  printHomologacaoLaudo,
  printRelatorio,
} from '@/lib/export';
import { getRuntimeTenantId } from '@/lib/tenantFilter';
import { TIPOS_VISTORIA } from '@/lib/tipoVistoria';
import {
  CHECKLIST_ITEMS,
  getKpis,
  getAssinaturaDisplayUrl,
  getVistoriaForOs,
  getVistoriaMapByOs,
  homologar,
  listAllOrdens,
  otimizarRotaFiscal,
  refreshFromServer,
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
    visitasHoje: 0,
    prazoVencido: 0,
    fiscais: [] as { nome: string; id: string }[],
  });
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [homologQueue, setHomologQueue] = useState<OrdemServico[]>([]);
  const [vistorias, setVistorias] = useState<Record<string, Vistoria>>({});
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroFiscal, setFiltroFiscal] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [destaqueId, setDestaqueId] = useState<string | null>(null);
  const [assinaturaUrls, setAssinaturaUrls] = useState<Record<string, string>>({});
  const [rotaFiscalId, setRotaFiscalId] = useState('');
  const [rotaGestorMsg, setRotaGestorMsg] = useState('');
  const online = useOnline();

  const reload = useCallback(async () => {
    const k = await getKpis();
    setKpis({
      osHoje: k.osHoje,
      concluidas: k.concluidas,
      homolog: k.homolog,
      divergencias: k.divergencias,
      visitasHoje: k.visitasHoje ?? 0,
      prazoVencido: k.prazoVencido ?? 0,
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
    const urls: Record<string, string> = {};
    for (const o of queue) {
      const v = vs[o.id];
      if (v) {
        const url = await getAssinaturaDisplayUrl(v.id);
        if (url) urls[o.id] = url;
      }
    }
    setAssinaturaUrls(urls);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useInterval(() => {
    if (isApiMode() && online) void refreshFromServer().then(() => reload());
  }, isApiMode() && online ? 30_000 : null);

  const fiscaisMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of ordens) m.set(o.fiscalId, o.fiscalNome);
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [ordens]);

  const ordensMapa = useMemo(() => {
    return ordens.filter((o) => {
      if (filtroStatus !== 'all' && o.status !== (filtroStatus as OsStatus)) return false;
      if (filtroFiscal !== 'all' && o.fiscalId !== filtroFiscal) return false;
      if (filtroTipo !== 'all' && o.tipo !== filtroTipo) return false;
      return true;
    });
  }, [ordens, filtroStatus, filtroFiscal, filtroTipo]);

  async function exportCsv(lista: OrdemServico[], suffix: string) {
    const vMap = await getVistoriaMapByOs();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`fisaval-os-${suffix}-${stamp}.csv`, buildOrdensCsvRows(lista, vMap));
  }

  async function otimizarRotaGestor() {
    if (!rotaFiscalId) {
      setRotaGestorMsg('Selecione um fiscal.');
      return;
    }
    const r = await otimizarRotaFiscal(rotaFiscalId);
    if (r.capacidadeRestante === 0) {
      setRotaGestorMsg('Capacidade diária de visitas esgotada para este fiscal.');
      return;
    }
    if (!r.paradas) {
      setRotaGestorMsg('Nenhuma OS ativa para este fiscal.');
      return;
    }
    const motor = r.engine === 'vroom' ? 'VROOM' : 'prazo+GPS';
    const seq = r.tiposRota?.length ? ` · ${r.tiposRota.join(' → ')}` : '';
    setRotaGestorMsg(
      `${r.paradas} parada(s) · ~${r.distanciaKm} km · ~${r.duracaoMinEst} min (${motor})${seq}`,
    );
    await reload();
  }

  async function imprimirRelatorio() {
    const vMap = await getVistoriaMapByOs();
    printRelatorio({
      geradoEm: new Date().toLocaleString('pt-BR'),
      kpis: {
        osHoje: kpis.osHoje,
        concluidas: kpis.concluidas,
        homolog: kpis.homolog,
        divergencias: kpis.divergencias,
      },
      ordens,
      homologQueue,
      vistoriaByOs: vMap,
    });
  }

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
        <div className="kpi">
          <strong>{kpis.visitasHoje}</strong>Visitas hoje
        </div>
        <div className="kpi">
          <strong>{kpis.prazoVencido}</strong>Prazo vencido
        </div>
      </div>

      <div className="card export-bar">
        <h2 style={{ margin: '0 0 0.5rem' }}>Roteirização</h2>
        <div className="export-actions" style={{ marginBottom: '1rem' }}>
          <select
            className="input"
            style={{ maxWidth: '220px' }}
            value={rotaFiscalId}
            onChange={(e) => setRotaFiscalId(e.target.value)}
          >
            <option value="">Fiscal…</option>
            {kpis.fiscais.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={() => void otimizarRotaGestor()}>
            Otimizar rota do fiscal
          </button>
        </div>
        {rotaGestorMsg && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{rotaGestorMsg}</p>
        )}
        <h2 style={{ margin: '0 0 0.5rem' }}>Relatórios</h2>
        <div className="export-actions">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => void exportCsv(ordensMapa, 'filtro')}>
            CSV — OS do filtro ({ordensMapa.length})
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => void exportCsv(ordens, 'todas')}>
            CSV — todas as OS ({ordens.length})
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void imprimirRelatorio()}>
            Imprimir / salvar PDF
          </button>
          {isApiMode() && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  void downloadAuthenticatedCsv('/export/ordens.csv', `fisaval-ordens-servidor.csv`)
                }
              >
                CSV servidor (OS)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  void downloadAuthenticatedCsv('/export/demandas.csv', `fisaval-demandas-servidor.csv`)
                }
              >
                CSV servidor (demandas)
              </button>
            </>
          )}
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
          CSV abre no Excel (separador ;). PDF: use &quot;Salvar como PDF&quot; na janela de impressão.
        </p>
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
          <label>
            Tipo
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="all">Todos</option>
              {TIPOS_VISTORIA.map((t) => (
                <option key={t} value={t}>
                  {t}
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
                    {o.visitaInicio && o.visitaFim ? ` · ${o.visitaInicio}–${o.visitaFim}` : ''}
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
                    {v.assinaturaNome && ` · Ass.: ${v.assinaturaNome}`}
                  </p>
                )}
                {assinaturaUrls[o.id] && (
                  <img
                    src={assinaturaUrls[o.id]}
                    alt="Assinatura fiscal"
                    className="assinatura-preview"
                    style={{ marginTop: '0.35rem' }}
                  />
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {v && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() =>
                          printHomologacaoLaudo({
                            os: o,
                            vistoria: v,
                            assinaturaUrl: assinaturaUrls[o.id],
                            tenantId: getRuntimeTenantId() || undefined,
                            geradoEm: new Date().toLocaleString('pt-BR'),
                          })
                        }
                      >
                        Imprimir laudo
                      </button>
                    )}
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
