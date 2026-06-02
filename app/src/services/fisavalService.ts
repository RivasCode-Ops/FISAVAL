import { db } from '@/db/database';
import type { Demanda, OrdemServico, OsStatus, Prioridade, Vistoria } from '@/types';

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

export const CHECKLIST_ITEMS = [
  { id: 'uso', label: 'Uso conforme cadastro' },
  { id: 'padrao', label: 'Padrão construtivo compatível' },
  { id: 'conservacao', label: 'Conservação regular' },
  { id: 'entorno', label: 'Infraestrutura do entorno OK' },
  { id: 'divergencia', label: 'Divergência cadastral identificada' },
] as const;

export async function listDemandas() {
  return db.demandas.orderBy('updatedAt').reverse().toArray();
}

export async function createDemanda(input: {
  tipo: string;
  bairro: string;
  prioridade: Prioridade;
  prazo: string;
  endereco?: string;
  inscricao?: string;
  lat?: number;
  lng?: number;
}) {
  const d: Demanda = {
    id: uid('D'),
    tipo: input.tipo,
    bairro: input.bairro,
    prioridade: input.prioridade,
    prazo: input.prazo,
    status: 'aberta',
    endereco: input.endereco,
    inscricao: input.inscricao,
    lat: input.lat ?? -23.55,
    lng: input.lng ?? -46.633,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.demandas.add(d);
  return d;
}

export async function gerarOs(demandaId: string, fiscalId: string, fiscalNome: string) {
  const demanda = await db.demandas.get(demandaId);
  if (!demanda) throw new Error('Demanda não encontrada');

  const count = await db.ordens.where('fiscalId').equals(fiscalId).count();
  const os: OrdemServico = {
    id: uid('OS'),
    demandaId,
    fiscalId,
    fiscalNome,
    inscricao: demanda.inscricao ?? '—',
    endereco: demanda.endereco ?? demanda.bairro,
    bairro: demanda.bairro,
    status: 'atribuida',
    lat: demanda.lat,
    lng: demanda.lng,
    rotaOrdem: count + 1,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.transaction('rw', db.demandas, db.ordens, async () => {
    await db.ordens.add(os);
    await db.demandas.update(demandaId, { status: 'os_gerada', updatedAt: now() });
  });
  return os;
}

export async function listOrdensFiscal(fiscalId: string) {
  const list = await db.ordens.where('fiscalId').equals(fiscalId).toArray();
  return list.sort((a, b) => a.rotaOrdem - b.rotaOrdem);
}

export async function listAllOrdens() {
  return db.ordens.orderBy('updatedAt').reverse().toArray();
}

export async function updateOsStatus(osId: string, status: OsStatus) {
  await db.ordens.update(osId, { status, updatedAt: now() });
}

export async function getOrCreateVistoria(osId: string): Promise<Vistoria> {
  const existing = await db.vistorias.where('osId').equals(osId).first();
  if (existing) return existing;
  const v: Vistoria = {
    id: uid('V'),
    osId,
    checklist: {},
    divergencia: false,
    syncStatus: 'local',
    createdAt: now(),
    updatedAt: now(),
  };
  await db.vistorias.add(v);
  return v;
}

export async function saveVistoria(
  vistoriaId: string,
  data: Partial<Pick<Vistoria, 'checklist' | 'divergencia' | 'justificativa' | 'checkInLat' | 'checkInLng' | 'checkInAt'>>,
) {
  await db.vistorias.update(vistoriaId, { ...data, updatedAt: now() });
}

export async function concluirVistoria(vistoriaId: string, osId: string) {
  const t = now();
  await db.transaction('rw', db.vistorias, db.ordens, async () => {
    await db.vistorias.update(vistoriaId, {
      concluidaAt: t,
      syncStatus: 'local',
      updatedAt: t,
    });
    await db.ordens.update(osId, { status: 'pendente_sync', updatedAt: t });
  });
}

export async function syncPendentes(fiscalId: string): Promise<number> {
  const ordens = await db.ordens
    .where('fiscalId')
    .equals(fiscalId)
    .filter((o) => o.status === 'pendente_sync')
    .toArray();
  let n = 0;
  for (const os of ordens) {
    const v = await db.vistorias.where('osId').equals(os.id).first();
    if (v) {
      await db.vistorias.update(v.id, { syncStatus: 'synced', updatedAt: now() });
      await db.ordens.update(os.id, { status: 'homologacao', updatedAt: now() });
      n++;
    }
  }
  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (api) {
    try {
      await fetch(`${api}/api/fisaval/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscalId, syncedAt: now(), count: n }),
      });
    } catch {
      /* offline OK — dados já locais */
    }
  }
  return n;
}

export async function homologar(osId: string, aprovado: boolean) {
  await db.ordens.update(osId, {
    status: aprovado ? 'homologada' : 'em_vistoria',
    updatedAt: now(),
  });
  if (aprovado) {
    const os = await db.ordens.get(osId);
    if (os) await db.demandas.update(os.demandaId, { status: 'concluida', updatedAt: now() });
  }
}

export async function getKpis() {
  const ordens = await db.ordens.toArray();
  const hoje = new Date().toISOString().slice(0, 10);
  const osHoje = ordens.filter((o) => o.createdAt.startsWith(hoje)).length;
  const concluidas = ordens.filter((o) =>
    ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status),
  ).length;
  const homolog = ordens.filter((o) => o.status === 'homologacao').length;
  const vistorias = await db.vistorias.toArray();
  const divergencias = vistorias.filter((v) => v.divergencia).length;
  const fiscais = await db.users.where('role').equals('fiscal').toArray();
  return { osHoje: osHoje || ordens.length, concluidas, homolog, divergencias, fiscais };
}

export async function listFiscais() {
  return db.users.where('role').equals('fiscal').toArray();
}
