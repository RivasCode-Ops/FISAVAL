import { useEffect, useState } from 'react';
import type { Demanda, Prioridade } from '@/types';
import { buildDemandasCsvRows, downloadCsv } from '@/lib/export';
import { isApiMode } from '@/api/config';
import {
  createDemanda,
  gerarOs,
  listDemandas,
  listFiscais,
  refreshFromServer,
} from '@/services/fisavalService';

export function DemandasPage() {
  const [lista, setLista] = useState<Demanda[]>([]);
  const [fiscais, setFiscais] = useState<{ id: string; nome: string }[]>([]);
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

  async function reload() {
    if (isApiMode() && navigator.onLine) await refreshFromServer();
    setLista(await listDemandas());
    const f = await listFiscais();
    const list = f.map((x) => ({ id: x.id, nome: x.nome }));
    setFiscais(list);
    if (!fiscalPadrao && list[0]) setFiscalPadrao(list[0].id);
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

  async function onGerarOs(demandaId: string) {
    const fiscal = fiscais.find((f) => f.id === fiscalPadrao);
    if (!fiscal) return;
    await gerarOs(demandaId, fiscal.id, fiscal.nome);
    setMsg(`OS gerada para ${fiscal.nome}.`);
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
            Fiscal padrão (OS)
            <select value={fiscalPadrao} onChange={(e) => setFiscalPadrao(e.target.value)}>
              {fiscais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
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
                  {d.status === 'aberta' && fiscalPadrao && (
                    <button type="button" className="btn btn-sm" onClick={() => void onGerarOs(d.id)}>
                      Gerar OS
                    </button>
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
