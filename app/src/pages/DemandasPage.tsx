import { useEffect, useState } from 'react';
import { fiscalHandlesTipo, labelTiposHabilitados } from '@/lib/tipoVistoria';
import type { Demanda, Prioridade, User } from '@/types';
import { buildDemandasCsvRows, downloadCsv } from '@/lib/export';
import { isApiMode } from '@/api/config';
import {
  createDemanda,
  gerarOs,
  listDemandas,
  listFiscais,
  importDemandasCsvFile,
  refreshFromServer,
} from '@/services/fisavalService';

export function DemandasPage() {
  const [lista, setLista] = useState<Demanda[]>([]);
  const [fiscais, setFiscais] = useState<Omit<User, 'senha'>[]>([]);
  const [tipo, setTipo] = useState('Revisão cadastral');
  const [bairro, setBairro] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [prazo, setPrazo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [msg, setMsg] = useState('');
  const [fiscalPadrao, setFiscalPadrao] = useState('');
  const [visitaInicio, setVisitaInicio] = useState('');
  const [visitaFim, setVisitaFim] = useState('');

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

  async function capturarGps() {
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 10000 });
    });
    if (!pos) {
      setMsg('GPS indisponível.');
      return;
    }
    setLat(pos.coords.latitude);
    setLng(pos.coords.longitude);
    setMsg('Coordenadas da demanda atualizadas.');
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDemanda({ tipo, bairro, prioridade, prazo, endereco, inscricao, lat, lng });
    setBairro('');
    setEndereco('');
    setInscricao('');
    setLat(undefined);
    setLng(undefined);
    setMsg('Demanda cadastrada.');
    await reload();
  }

  function fiscaisHabilitadosPara(tipo: string) {
    return fiscais.filter((f) => fiscalHandlesTipo(f.tiposHabilitados, tipo));
  }

  async function onGerarOs(demandaId: string, tipoDemanda: string) {
    const habilitados = fiscaisHabilitadosPara(tipoDemanda);
    const fiscal =
      habilitados.find((f) => f.id === fiscalPadrao) ?? habilitados[0];
    if (!fiscal) {
      setMsg(`Nenhum fiscal habilitado para "${tipoDemanda}".`);
      return;
    }
    try {
      const janela =
        visitaInicio && visitaFim ? { visitaInicio, visitaFim } : undefined;
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
      <div className="card">
        <h2>Nova demanda</h2>
        <form onSubmit={(e) => void onCreate(e)} className="grid2">
          <div>
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Revisão cadastral</option>
              <option>Recadastramento</option>
              <option>Denúncia</option>
              <option>Auditoria interna</option>
            </select>
            <label>Bairro / setor</label>
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} required />
            <label>Inscrição (opcional)</label>
            <input value={inscricao} onChange={(e) => setInscricao(e.target.value)} />
          </div>
          <div>
            <label>Prioridade</label>
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <label>Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required />
            <label>Endereço</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '0.35rem' }} onClick={() => void capturarGps()}>
              Usar GPS nesta demanda
            </button>
            {lat != null && lng != null && (
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </small>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn">
              Cadastrar demanda
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Importar cadastro (CSV)</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Colunas: <code>bairro</code> (obrig.), <code>inscricao</code>, <code>endereco</code>, <code>tipo</code>,{' '}
          <code>prioridade</code>, <code>prazo</code>, <code>lat</code>, <code>lng</code> — separador ; ou ,
        </p>
        <p style={{ fontSize: '0.85rem' }}>
          Modelo: <a href="https://github.com/RivasCode-Ops/FISAVAL/blob/main/docs/samples/import-demandas.csv">import-demandas.csv</a>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void importDemandasCsvFile(file).then((r) => {
              setMsg(`${r.created} demanda(s) importada(s).${r.errors.length ? ` Avisos: ${r.errors.join('; ')}` : ''}`);
              void reload();
            });
            e.target.value = '';
          }}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, flex: 1 }}>Fila de demandas</h2>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            Janela visita
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
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            Fiscal padrão (OS)
            <select value={fiscalPadrao} onChange={(e) => setFiscalPadrao(e.target.value)}>
              {fiscais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} ({labelTiposHabilitados(f.tiposHabilitados)})
                </option>
              ))}
            </select>
          </label>
        </div>
        {msg && <p style={{ color: 'var(--ok)', fontSize: '0.9rem' }}>{msg}</p>}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Bairro</th>
              <th>Prio</th>
              <th>Prazo</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.tipo}</td>
                <td>{d.bairro}</td>
                <td>
                  <span className={`badge ${priClass(d.prioridade)}`}>{d.prioridade}</span>
                </td>
                <td>{d.prazo}</td>
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Sem fiscal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
