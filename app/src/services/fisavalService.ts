import { apiClient, apiPushState } from '@/api/client';
import { isApiMode } from '@/api/config';
import { db } from '@/db/database';
import type { Demanda, OrdemServico, OsStatus, Prioridade, Vistoria } from '@/types';

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

async function pushApi() {
  if (isApiMode() && navigator.onLine) {
    try {
      await apiPushState();
    } catch {
      /* mantém cópia local */
    }
  }
}

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
  let d: Demanda;
  if (isApiMode() && navigator.onLine) {
    d = await apiClient.createDemanda(input);
    await db.demandas.put(d);
  } else {
    d = {
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
    await pushApi();
  }
  return d;
}

export async function gerarOs(demandaId: string, fiscalId: string, fiscalNome: string) {
  if (isApiMode() && navigator.onLine) {
    const os = await apiClient.gerarOs(demandaId, fiscalId, fiscalNome);
    await db.ordens.put(os);
    const demanda = await db.demandas.get(demandaId);
    if (demanda) await db.demandas.put({ ...demanda, status: 'os_gerada', updatedAt: now() });
    return os;
  }
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
  await pushApi();
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
  if (isApiMode() && navigator.onLine) {
    const os = await apiClient.patchOrdem(osId, status);
    if (os) await db.ordens.put(os);
    return;
  }
  await db.ordens.update(osId, { status, updatedAt: now() });
  await pushApi();
}

export async function getOrCreateVistoria(osId: string): Promise<Vistoria> {
  const existing = await db.vistorias.where('osId').equals(osId).first();
  if (existing) return existing;
  if (isApiMode() && navigator.onLine) {
    let v = await apiClient.getVistoria(osId);
    if (!v) v = await apiClient.createVistoria(osId);
    await db.vistorias.put(v);
    return v;
  }
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
  await pushApi();
  return v;
}

export async function saveVistoria(
  vistoriaId: string,
  data: Partial<Pick<Vistoria, 'checklist' | 'divergencia' | 'justificativa' | 'checkInLat' | 'checkInLng' | 'checkInAt'>>,
) {
  if (isApiMode() && navigator.onLine) {
    const v = await apiClient.patchVistoria(vistoriaId, data);
    await db.vistorias.put(v);
    return;
  }
  await db.vistorias.update(vistoriaId, { ...data, updatedAt: now() });
  await pushApi();
}

export async function concluirVistoria(vistoriaId: string, osId: string) {
  const t = now();
  if (isApiMode() && navigator.onLine) {
    await apiClient.patchVistoria(vistoriaId, { concluidaAt: t, syncStatus: 'local' });
    await apiClient.patchOrdem(osId, 'pendente_sync');
    const v = await db.vistorias.get(vistoriaId);
    const o = await db.ordens.get(osId);
    if (v) await db.vistorias.put({ ...v, concluidaAt: t, syncStatus: 'local', updatedAt: t });
    if (o) await db.ordens.put({ ...o, status: 'pendente_sync', updatedAt: t });
    return;
  }
  await db.transaction('rw', db.vistorias, db.ordens, async () => {
    await db.vistorias.update(vistoriaId, { concluidaAt: t, syncStatus: 'local', updatedAt: t });
    await db.ordens.update(osId, { status: 'pendente_sync', updatedAt: t });
  });
  await pushApi();
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
  await pushApi();
  return n;
}

export async function homologar(osId: string, aprovado: boolean) {
  if (isApiMode() && navigator.onLine) {
    await apiClient.homologar(osId, aprovado);
    const os = await db.ordens.get(osId);
    if (os) {
      await db.ordens.put({
        ...os,
        status: aprovado ? 'homologada' : 'em_vistoria',
        updatedAt: now(),
      });
      if (aprovado) {
        const d = await db.demandas.get(os.demandaId);
        if (d) await db.demandas.put({ ...d, status: 'concluida', updatedAt: now() });
      }
    }
    return;
  }
  await db.ordens.update(osId, {
    status: aprovado ? 'homologada' : 'em_vistoria',
    updatedAt: now(),
  });
  if (aprovado) {
    const os = await db.ordens.get(osId);
    if (os) await db.demandas.update(os.demandaId, { status: 'concluida', updatedAt: now() });
  }
  await pushApi();
}

export async function getKpis() {
  if (isApiMode() && navigator.onLine) {
    try {
      const k = await apiClient.getKpis();
      return {
        osHoje: k.osHoje,
        concluidas: k.concluidas,
        homolog: k.homolog,
        divergencias: k.divergencias,
        fiscais: k.fiscais as Awaited<ReturnType<typeof listFiscais>>,
      };
    } catch {
      /* fallback local */
    }
  }
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
