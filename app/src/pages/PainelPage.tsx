import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl, isApiMode } from '@/api/config';
import { subscribeWebPush } from '@/lib/push';
import { downloadAuthenticatedCsv } from '@/lib/apiDownload';
import { useInterval } from '@/hooks/useInterval';
import { useOnline } from '@/hooks/useOnline';
import type { OrdemServico, OsStatus, Vistoria } from '@/types';
import { PAINEL_MAP_LEGEND, PainelMap } from '@/components/PainelMap';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import {
  buildLaudoHtml,
  type LaudoFotoItem,
  buildOrdensCsvRows,
  buildRelatorioHtml,
  downloadCsv,
} from '@/lib/export';
import { PrintPreviewModal } from '@/components/PrintPreviewModal';
import { getRuntimeTenantId } from '@/lib/tenantFilter';
import { fiscalHandlesTipo, TIPOS_VISTORIA } from '@/lib/tipoVistoria';
import { checklistForFinalidade, labelFinalidade, resolveFinalidade } from '@/lib/finalidadeVistoria';
import {
  getKpis,
  gerarOs,
  listAlertasPrazo,
  type DemandaPrazoAlerta,
  type OrdemPrazoAlerta,
  getAssinaturaDisplayUrl,
  getFotoDisplayUrl,
  getVistoriaForOs,
  getVistoriaMapByOs,
  homologar,
  listAllOrdens,
  listFotos,
  otimizarRotaFiscal,
  refreshFromServer,
  sugerirFiscalParaTipo,
} from '@/services/fisavalService';
import type { User } from '@/types';
import { PILOTO_LOCAL } from '@/lib/pilotoLocal';

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
    demandasVencidas: 0,
    fiscais: [] as { nome: string; id: string; tiposHabilitados?: string[] }[],
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
  const [alertasDemandas, setAlertasDemandas] = useState<DemandaPrazoAlerta[]>([]);
  const [alertasPrazo, setAlertasPrazo] = useState<OrdemPrazoAlerta[]>([]);
  const [pushPrazoMsg, setPushPrazoMsg] = useState('');
  const [gerarOsMsg, setGerarOsMsg] = useState('');
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [printPreview, setPrintPreview] = useState<{ title: string; html: string } | null>(null);
  const online = useOnline();

  useEffect(() => {
    const base = getApiUrl();
    if (!base || !isApiMode()) return;
    void fetch(`${base}/api/fisaval/config`)
      .then((r) => r.json())
      .then((c: { smtpEnabled?: boolean }) => setSmtpEnabled(!!c.smtpEnabled))
      .catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    const k = await getKpis();
    setKpis({
      osHoje: k.osHoje,
      concluidas: k.concluidas,
      homolog: k.homolog,
      divergencias: k.divergencias,
      visitasHoje: k.visitasHoje ?? 0,
      prazoVencido: k.prazoVencido ?? 0,
      demandasVencidas: k.demandasVencidas ?? 0,
      fiscais: k.fiscais.map((f) => ({
        id: f.id,
        nome: f.nome,
        tiposHabilitados: (f as User).tiposHabilitados,
      })),
    });
    const all = await listAllOrdens();
    setOrdens(all);
    const alertas = await listAlertasPrazo();
    setAlertasDemandas(alertas.demandas);
    setAlertasPrazo(alertas.ordens);
    const laudoStatuses: OsStatus[] = ['homologacao', 'pendente_sync'];
    const queue: OrdemServico[] = [];
    for (const o of all) {
      if (!laudoStatuses.includes(o.status)) continue;
      const v = await getVistoriaForOs(o.id);
      if (v?.concluidaAt) queue.push(o);
    }
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

  async function onGerarOsDemanda(d: DemandaPrazoAlerta) {
    const tipo = d.tipo ?? d.finalidade ?? '';
    const habilitados = kpis.fiscais.filter((f) => fiscalHandlesTipo(f.tiposHabilitados, tipo));
    if (habilitados.length === 0) {
      setGerarOsMsg(`Nenhum fiscal habilitado para "${tipo}".`);
      return;
    }
    const sugeridoId = await sugerirFiscalParaTipo(tipo);
    const fiscal = habilitados.find((f) => f.id === sugeridoId) ?? habilitados[0];
    try {
      await gerarOs(d.id, fiscal.id, fiscal.nome);
      setGerarOsMsg(`OS gerada para ${fiscal.nome} (${d.id}).`);
      await reload();
    } catch (e) {
      setGerarOsMsg(e instanceof Error ? e.message : 'Não foi possível gerar a OS.');
    }
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

  async function verRelatorio() {
    const vMap = await getVistoriaMapByOs();
    setPrintPreview({
      title: 'Relatório operacional',
      html: buildRelatorioHtml({
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
      }),
    });
  }

  async function verLaudo(o: OrdemServico, v: Vistoria) {
    const fin = resolveFinalidade(o);
    const fotoList = await listFotos(v.id);
    const fotos: LaudoFotoItem[] = [];
    for (const f of fotoList) {
      const url = await getFotoDisplayUrl(f.id);
      fotos.push({ ...f, url: url ?? undefined });
    }
    setPrintPreview({
      title: `Laudo ${o.id}`,
      html: buildLaudoHtml({
        os: o,
        vistoria: v,
        finalidade: fin,
        dadosReferencia: o.dadosReferencia,
        assinaturaUrl: assinaturaUrls[o.id],
        tenantId: getRuntimeTenantId() || undefined,
        geradoEm: new Date().toLocaleString('pt-BR'),
        fotos,
      }),
    });
  }

  return (
    <>
      <PrintPreviewModal
        open={!!printPreview}
        title={printPreview?.title ?? ''}
        html={printPreview?.html ?? ''}
        onClose={() => setPrintPreview(null)}
      />

      <PageHeader
        title="Painel operacional"
        description="Homologação de laudos, indicadores e mapa — decisão sobre o que foi constatado em campo."
      />

      {alertasDemandas.length > 0 && (
        <SectionCard
          title={`Demandas sem OS — prazo (${alertasDemandas.length})`}
          className="card--danger"
        >
          <table>
            <thead>
              <tr>
                <th>Demanda</th>
                <th>Finalidade</th>
                <th>Bairro</th>
                <th>Prazo</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {alertasDemandas.map((d) => {
                const tipo = d.tipo ?? d.finalidade ?? '';
                const temFiscal = kpis.fiscais.some((f) => fiscalHandlesTipo(f.tiposHabilitados, tipo));
                return (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.finalidade ?? '—'}</td>
                  <td>{d.bairro}</td>
                  <td>{d.prazo}</td>
                  <td>
                    <span className={`badge ${d.statusPrazo === 'VENCIDA' ? 'b-pri-alta' : 'b-pri-media'}`}>
                      {d.labelCurto}
                    </span>
                  </td>
                  <td>
                    {temFiscal ? (
                      <button type="button" className="btn btn-sm" onClick={() => void onGerarOsDemanda(d)}>
                        Gerar OS
                      </button>
                    ) : (
                      <span className="muted">Sem fiscal</span>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          {gerarOsMsg && <p className="muted">{gerarOsMsg}</p>}
          <p className="muted">Gere a OS aqui ou em Demandas antes do prazo de vistoria.</p>
        </SectionCard>
      )}

      {alertasPrazo.length > 0 && (
        <SectionCard
          title={`OS sem check-in — prazo de campo (${alertasPrazo.length})`}
          className="card--danger"
        >
          <table>
            <thead>
              <tr>
                <th>OS</th>
                <th>Fiscal</th>
                <th>Endereço</th>
                <th>Prazo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {alertasPrazo.map((o) => (
                <tr
                  key={o.id}
                  className="row-clickable"
                  onClick={() => setDestaqueId(o.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setDestaqueId(o.id)}
                  tabIndex={0}
                >
                  <td>{o.id}</td>
                  <td>{o.fiscalNome}</td>
                  <td>{o.endereco}</td>
                  <td>{o.prazo}</td>
                  <td>
                    <span className={`badge ${o.statusPrazo === 'VENCIDA' ? 'b-pri-alta' : 'b-pri-media'}`}>
                      {o.labelCurto}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Clique na linha para destacar no mapa.</p>
          {!PILOTO_LOCAL && isApiMode() && online && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                void subscribeWebPush(['prazo_vencido']).then((r) => {
                  const labels: Record<string, string> = {
                    ok: 'Push de prazo vencido ativado neste navegador.',
                    denied: 'Permissão de notificação negada.',
                    'no-vapid': 'Configure VAPID na API.',
                    unsupported: 'Navegador sem suporte.',
                    error: 'Falha ao registrar push.',
                  };
                  setPushPrazoMsg(labels[r] ?? r);
                });
              }}
            >
              Ativar notificação push (prazo)
            </button>
          )}
          {pushPrazoMsg && <p className="text-ok">{pushPrazoMsg}</p>}
          {!PILOTO_LOCAL && smtpEnabled && (
            <p className="muted">E-mail automático ativo (gestores/admins do tenant + ALERTA_EMAIL_TO).</p>
          )}
        </SectionCard>
      )}

      <div className="kpi-grid">
        <div className="kpi kpi--accent">
          <strong>{kpis.osHoje}</strong>OS (ref.)
        </div>
        <div className="kpi">
          <strong>{kpis.concluidas}</strong>Em fluxo / ok
        </div>
        <div className="kpi kpi--purple">
          <strong>{kpis.homolog}</strong>Homolog. pend.
        </div>
        <div className="kpi kpi--danger">
          <strong>{kpis.divergencias}</strong>Divergências
        </div>
        <div className="kpi">
          <strong>{kpis.visitasHoje}</strong>Visitas hoje
        </div>
        <div className="kpi kpi--warn">
          <strong>{kpis.demandasVencidas}</strong>Dem. vencidas
        </div>
        <div className="kpi kpi--warn">
          <strong>{kpis.prazoVencido}</strong>OS campo venc.
        </div>
      </div>

      <div className="painel-dashboard">
        <SectionCard
          id="homologacao"
          title="Homologação cadastral — laudos"
          subtitle="Vistorias concluídas aguardando laudo ou homologação."
        >
          {homologQueue.length === 0 ? (
            <div className="muted stack stack--sm">
              <p>Nenhuma vistoria concluída aguardando laudo.</p>
              <ol>
                <li>Fiscal: concluir vistoria em <strong>Campo</strong> (assinatura obrigatória).</li>
                <li>A OS aparece aqui com status <em>pendente sync</em> ou <em>homologação</em>.</li>
                <li>Clique <strong>Ver laudo</strong> → depois <strong>Imprimir / Salvar PDF</strong>.</li>
              </ol>
            </div>
          ) : (
            homologQueue.map((o) => {
              const v = vistorias[o.id];
              const fin = resolveFinalidade(o);
              const checks = v
                ? checklistForFinalidade(fin).filter((c) => v.checklist[c.id]).map((c) => c.label)
                : [];
              return (
                <div key={o.id} className="homolog-item">
                  <strong>{o.id}</strong> — {o.inscricao}
                  <br />
                  <span className="badge b-status">{labelFinalidade(o.finalidade ?? o.tipo)}</span>{' '}
                  <span className="badge b-status">{o.status}</span>
                  <br />
                  <small>
                    {o.endereco} · {o.fiscalNome}
                  </small>
                  {v && (
                    <p className="muted">
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
                    <img src={assinaturaUrls[o.id]} alt="Assinatura fiscal" className="assinatura-preview" />
                  )}
                  <div className="cluster">
                    {v && (
                      <button type="button" className="btn btn-sm" onClick={() => void verLaudo(o, v)}>
                        Ver laudo
                      </button>
                    )}
                    {o.status === 'homologacao' && (
                      <>
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
                      </>
                    )}
                    {o.status === 'pendente_sync' && (
                      <span className="muted">Fiscal pode sincronizar para mover para homologação.</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </SectionCard>

        <SectionCard
          title={PILOTO_LOCAL ? 'Laudo e relatórios' : 'Relatórios'}
          subtitle={
            PILOTO_LOCAL
              ? 'Visualização na tela — sem pop-up bloqueado.'
              : 'CSV e PDF operacional.'
          }
          highlight
          className="export-bar"
        >
          {!PILOTO_LOCAL && (
            <div className="stack stack--sm">
              <p className="section-card__subtitle">Roteirização</p>
              <div className="export-actions cluster">
                <select value={rotaFiscalId} onChange={(e) => setRotaFiscalId(e.target.value)}>
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
              {rotaGestorMsg && <p className="muted">{rotaGestorMsg}</p>}
            </div>
          )}
          <div className="export-actions cluster">
            {!PILOTO_LOCAL && (
              <>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => void exportCsv(ordensMapa, 'filtro')}>
                  CSV — OS do filtro ({ordensMapa.length})
                </button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => void exportCsv(ordens, 'todas')}>
                  CSV — todas as OS ({ordens.length})
                </button>
              </>
            )}
            <button type="button" className="btn btn-sm" onClick={() => void verRelatorio()}>
              {PILOTO_LOCAL ? 'Ver relatório operacional' : 'Imprimir / salvar PDF'}
            </button>
            {!PILOTO_LOCAL && isApiMode() && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => void downloadAuthenticatedCsv('/export/ordens.csv', `fisaval-ordens-servidor.csv`)}
                >
                  CSV servidor (OS)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => void downloadAuthenticatedCsv('/export/demandas.csv', `fisaval-demandas-servidor.csv`)}
                >
                  CSV servidor (demandas)
                </button>
              </>
            )}
          </div>
          {PILOTO_LOCAL && (
            <p className="muted">
              O relatório abre <strong>na própria tela</strong>. Use <strong>Imprimir / Salvar PDF</strong> no topo.
              {homologQueue.length === 0
                ? ' Laudos por OS aparecem em Homologação quando o fiscal concluir a vistoria.'
                : ` ${homologQueue.length} laudo(s) disponível(is) ao lado.`}
            </p>
          )}
          <p className="muted">
            {PILOTO_LOCAL
              ? 'PDF: botão Imprimir / Salvar PDF dentro da visualização.'
              : 'CSV abre no Excel (;). PDF: Salvar como PDF na impressão.'}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Mapa operacional">
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
          <span className="map-filters-count">{ordensMapa.length} OS no mapa</span>
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
      </SectionCard>

      <details className="card details-card">
        <summary>Todas as ordens de serviço ({ordens.length})</summary>
        <table>
          <thead>
            <tr>
              <th>OS</th>
              <th>Finalidade</th>
              <th>Fiscal</th>
              <th>Bairro</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr
                key={o.id}
                className={`row-clickable${destaqueId === o.id ? ' row-highlight' : ''}`}
                onClick={() => setDestaqueId(o.id)}
              >
                <td>{o.id}</td>
                <td>{labelFinalidade(o.finalidade ?? o.tipo)}</td>
                <td>{o.fiscalNome}</td>
                <td>{o.bairro}</td>
                <td>
                  <span className="badge b-status">{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <details className="card details-card">
        <summary>Fiscais ({kpis.fiscais.length})</summary>
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
      </details>
    </>
  );
}
