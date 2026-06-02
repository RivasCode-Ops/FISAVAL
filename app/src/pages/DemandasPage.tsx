import { useEffect, useState } from 'react';
import type { Demanda, Prioridade } from '@/types';
import {
  createDemanda,
  gerarOs,
  listDemandas,
  listFiscais,
} from '@/services/fisavalService';

export function DemandasPage() {
  const [lista, setLista] = useState<Demanda[]>([]);
  const [fiscais, setFiscais] = useState<{ id: string; nome: string }[]>([]);
  const [tipo, setTipo] = useState('Revisão cadastral');
  const [bairro, setBairro] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [prazo, setPrazo] = useState('');
  const [endereco, setEndereco] = useState('');

  async function reload() {
    setLista(await listDemandas());
    const f = await listFiscais();
    setFiscais(f.map((x) => ({ id: x.id, nome: x.nome })));
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDemanda({ tipo, bairro, prioridade, prazo, endereco });
    setBairro('');
    setEndereco('');
    await reload();
  }

  async function onGerarOs(demandaId: string, fiscalId: string, fiscalNome: string) {
    await gerarOs(demandaId, fiscalId, fiscalNome);
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
          </div>
        </form>
        <button type="submit" className="btn">
          Cadastrar demanda
        </button>
      </div>

      <div className="card">
        <h2>Fila de demandas</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Tipo</th><th>Bairro</th><th>Prio</th><th>Prazo</th><th>Status</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.tipo}</td>
                <td>{d.bairro}</td>
                <td><span className={`badge ${priClass(d.prioridade)}`}>{d.prioridade}</span></td>
                <td>{d.prazo}</td>
                <td><span className="badge b-status">{d.status}</span></td>
                <td>
                  {d.status === 'aberta' && fiscais[0] && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void onGerarOs(d.id, fiscais[0].id, fiscais[0].nome)}
                    >
                      Gerar OS → {fiscais[0].nome}
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
