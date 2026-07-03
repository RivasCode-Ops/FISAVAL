import { useEffect, useState } from 'react';
import { fiscalHandlesTipo, labelTiposHabilitados } from '@/lib/tipoVistoria';
import type { Demanda, FinalidadeVistoria, Prioridade, User } from '@/types';
import {
  emptyReferencia,
  FINALIDADES,
  FINALIDADE_LABELS,
  labelFinalidade,
  REFERENCIA_FIELDS,
} from '@/lib/finalidadeVistoria';
import { buildDemandasCsvRows, downloadCsv } from '@/lib/export';
import { isApiMode } from '@/api/config';
import { PILOTO_LOCAL } from '@/lib/pilotoLocal';
import { capturePosition, formatCoords } from '@/lib/geolocation';
import { CoordLinks } from '@/components/CoordLinks';
import { badgeClassStatusPrazo, calcPrazoDemanda, resolvePrazoVistoria } from '@/lib/prazoStatus';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import {
  createDemanda,
  gerarOs,
  listDemandas,
  listFiscais,
  sugerirFiscalParaTipo,
  refreshFromServer,
} from '@/services/fisavalService';

export function DemandasPage() {
  const [lista, setLista] = useState<Demanda[]>([]);
  const [fiscais, setFiscais] = useState<Omit<User, 'senha'>[]>([]);
  const [finalidade, setFinalidade] = useState<FinalidadeVistoria>('IPTU');
  const [dadosReferencia, setDadosReferencia] = useState<Record<string, string>>(() =>
    emptyReferencia('IPTU'),
  );
  const [bairro, setBairro] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [prazo, setPrazo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | undefined>();
  const [msg, setMsg] = useState('');
  const [fiscalPadrao, setFiscalPadrao] = useState('');
  const [sugestaoNome, setSugestaoNome] = useState('');
  const [visitaInicio, setVisitaInicio] = useState('');
  const [visitaFim, setVisitaFim] = useState('');

  const tipoAtual = FINALIDADE_LABELS[finalidade];

  async function reload() {
    if (isApiMode() && navigator.onLine) await refreshFromServer();
    setLista(await listDemandas());
    const f = await listFiscais();
    setFiscais(f);
    if (!fiscalPadrao && f[0]) setFiscalPadrao(f[0].id);
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    void sugerirFiscalParaTipo(tipoAtual).then((id) => {
      if (!id) {
        setSugestaoNome('');
        return;
      }
      setFiscalPadrao(id);
      const f = fiscais.find((x) => x.id === id);
      setSugestaoNome(f?.nome ?? '');
    });
  }, [tipoAtual, fiscais]);

  function onFinalidadeChange(f: FinalidadeVistoria) {
    setFinalidade(f);
    setDadosReferencia(emptyReferencia(f));
  }

  function onCoordInput(raw: string, axis: 'lat' | 'lng') {
    const normalized = raw.trim().replace(',', '.');
    if (!normalized) {
      if (axis === 'lat') setLat(undefined);
      else setLng(undefined);
      return;
    }
    const n = Number(normalized);
    if (!Number.isFinite(n)) return;
    if (axis === 'lat') setLat(n);
    else setLng(n);
  }

  async function capturarGps() {
    const result = await capturePosition();
    if (!result.ok) {
      setMsg(result.message);
      return;
    }
    setLat(result.position.lat);
    setLng(result.position.lng);
    setGpsAccuracyM(result.position.accuracyM);
    setMsg(
      `Coordenadas: ${formatCoords(result.position.lat, result.position.lng)} (±${Math.round(result.position.accuracyM)} m).`,
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDemanda({
      finalidade,
      dadosReferencia,
      bairro,
      prioridade,
      prazo,
      endereco,
      inscricao,
      lat,
      lng,
    });
    setBairro('');
    setEndereco('');
    setInscricao('');
    setLat(undefined);
    setLng(undefined);
    setDadosReferencia(emptyReferencia(finalidade));
    setMsg('Demanda cadastrada.');
    await reload();
  }

  function fiscaisHabilitadosPara(tipo: string) {
    return fiscais.filter((f) => fiscalHandlesTipo(f.tiposHabilitados, tipo));
  }

  async function onGerarOs(demandaId: string, tipoDemanda: string) {
    const habilitados = fiscaisHabilitadosPara(tipoDemanda);
    const fiscal = habilitados.find((f) => f.id === fiscalPadrao) ?? habilitados[0];
    if (!fiscal) {
      setMsg(`Nenhum fiscal habilitado para "${tipoDemanda}".`);
      return;
    }
    try {
      const janela = visitaInicio && visitaFim ? { visitaInicio, visitaFim } : undefined;
      await gerarOs(demandaId, fiscal.id, fiscal.nome, janela);
      setMsg(`OS gerada para ${fiscal.nome}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível gerar a OS.');
    }
    await reload();
  }

  const priClass = (p: Prioridade) =>
    p === 'alta' ? 'b-pri-alta' : p === 'media' ? 'b-pri-media' : 'b-pri-baixa';

  return (
    <>
      <PageHeader
        title="Demandas"
        description="Pedidos internos por finalidade (IPTU, ITBI…), com dados de referência do cadastro."
      />

      {msg && <p className="text-ok">{msg}</p>}

      <div className="demandas-layout">
        <div className="stack">
          <SectionCard title="Nova demanda">
            <form onSubmit={(e) => void onCreate(e)} className="stack">
              <div className="form-section">
                <h3 className="form-section__title">Identificação</h3>
                <label>Finalidade da vistoria</label>
                <select
                  value={finalidade}
                  onChange={(e) => onFinalidadeChange(e.target.value as FinalidadeVistoria)}
                >
                  {FINALIDADES.map((f) => (
                    <option key={f} value={f}>
                      {FINALIDADE_LABELS[f]}
                    </option>
                  ))}
                </select>
                <label>Bairro / setor</label>
                <input value={bairro} onChange={(e) => setBairro(e.target.value)} required />
                <label>Inscrição (opcional)</label>
                <input value={inscricao} onChange={(e) => setInscricao(e.target.value)} />
                <label>Prioridade</label>
                <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
                <label>Prazo para vistoria</label>
                <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required />
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Local</h3>
                <label>Endereço</label>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => void capturarGps()}>
                  Usar GPS nesta demanda
                </button>
                <label>Coordenadas (opcional)</label>
                <div className="coord-grid">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Latitude (-23.55…)"
                    value={lat ?? ''}
                    onChange={(e) => onCoordInput(e.target.value, 'lat')}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Longitude (-46.63…)"
                    value={lng ?? ''}
                    onChange={(e) => onCoordInput(e.target.value, 'lng')}
                  />
                </div>
                {lat != null && lng != null && (
                  <p className="muted">
                    <CoordLinks lat={lat} lng={lng} showCoords />
                    {gpsAccuracyM != null ? ` · precisão ±${Math.round(gpsAccuracyM)} m` : ''}
                  </p>
                )}
              </div>

              <div className="form-section">
                <h3 className="form-section__title">Referência</h3>
                <div className="grid2">
                  {REFERENCIA_FIELDS[finalidade].map((f) => (
                    <div key={f.key}>
                      <label>{f.label}</label>
                      <input
                        value={dadosReferencia[f.key] ?? ''}
                        onChange={(e) =>
                          setDadosReferencia((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-block">
                Cadastrar demanda
              </button>
            </form>
          </SectionCard>
        </div>

        <SectionCard
          title="Fila de demandas"
          className="demandas-layout__queue"
          actions={
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const stamp = new Date().toISOString().slice(0, 10);
                downloadCsv(`fisaval-demandas-${stamp}.csv`, buildDemandasCsvRows(lista));
              }}
            >
              Exportar CSV
            </button>
          }
        >
          <div className="cluster">
            {!PILOTO_LOCAL && (
              <label className="checklist">
                Janela visita
                <span className="cluster">
                  <input
                    type="time"
                    value={visitaInicio}
                    onChange={(e) => setVisitaInicio(e.target.value)}
                    title="Início (opcional)"
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={visitaFim}
                    onChange={(e) => setVisitaFim(e.target.value)}
                    title="Fim (opcional)"
                  />
                </span>
              </label>
            )}
            <label className="checklist">
              Fiscal padrão (OS)
              <select value={fiscalPadrao} onChange={(e) => setFiscalPadrao(e.target.value)}>
                {fiscais.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome} ({labelTiposHabilitados(f.tiposHabilitados)})
                  </option>
                ))}
              </select>
            </label>
            {sugestaoNome && fiscalPadrao && (
              <span className="muted">Sugerido: {sugestaoNome}</span>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Finalidade</th>
                <th>Bairro</th>
                <th>Prio</th>
                <th>Prazo vistoria</th>
                <th>Situação prazo</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => {
                const prazoCalc = calcPrazoDemanda(d);
                const prazoLabel = resolvePrazoVistoria(d)?.slice(0, 10) ?? '—';
                return (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{labelFinalidade(d.finalidade ?? d.tipo)}</td>
                  <td>{d.bairro}</td>
                  <td>
                    <span className={`badge ${priClass(d.prioridade)}`}>{d.prioridade}</span>
                  </td>
                  <td>{prazoLabel}</td>
                  <td>
                    <span className={`badge ${badgeClassStatusPrazo(prazoCalc.statusPrazo)}`}>
                      {prazoCalc.labelCurto}
                    </span>
                  </td>
                  <td>
                    <span className="badge b-status">{d.status}</span>
                  </td>
                  <td>
                    {d.status === 'aberta' && fiscaisHabilitadosPara(d.tipo).length > 0 && (
                      <button type="button" className="btn btn-sm" onClick={() => void onGerarOs(d.id, d.tipo)}>
                        Gerar OS
                      </button>
                    )}
                    {d.status === 'aberta' && fiscaisHabilitadosPara(d.tipo).length === 0 && (
                      <span className="muted">Sem fiscal</span>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
}
