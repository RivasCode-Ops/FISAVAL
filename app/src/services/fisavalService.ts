import { apiClient, apiFotoBlobUrl, apiPushState, apiUploadFoto, hydrateDexieFromApi } from '@/api/client';
import { isApiMode } from '@/api/config';
import { db } from '@/db/database';
import {
  fotoMeta,
  getFotoLocal,
  listFotosDexie,
  listFotosPendentes,
  markFotoSynced,
  saveFotoLocal,
} from '@/db/fotos';
import { filtrarOsAtivas, ordenarPorProximidade, type GeoPoint } from '@/lib/rota';
import type { Demanda, OrdemServico, OsStatus, Prioridade, Vistoria, VistoriaFoto } from '@/types';

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

/** Baixa estado atual da API para o IndexedDB (gestor / multi-dispositivo). */
export async function refreshFromServer(): Promise<boolean> {
  if (!isApiMode() || !navigator.onLine) return false;
  try {
    await hydrateDexieFromApi();
    return true;
  } catch {
    return false;
  }
}

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
  return list.sort((a, b) => a.rotaOrdem - b.rotaOrdem || a.updatedAt.localeCompare(b.updatedAt));
}

export async function getVistoriaForOs(osId: string) {
  return db.vistorias.where('osId').equals(osId).first();
}

export async function otimizarRotaFiscal(fiscalId: string, start?: GeoPoint): Promise<number> {
  const ativas = filtrarOsAtivas(await db.ordens.where('fiscalId').equals(fiscalId).toArray());
  if (ativas.length < 2) return ativas.length;

  const origin = start ?? { lat: ativas[0].lat, lng: ativas[0].lng };

  const ordered = ordenarPorProximidade(ativas, origin);
  const t = now();
  await db.transaction('rw', [db.ordens], async () => {
    for (let i = 0; i < ordered.length; i++) {
      await db.ordens.update(ordered[i].id, { rotaOrdem: i + 1, updatedAt: t });
    }
  });
  await pushApi();
  return ordered.length;
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
  const t = now();

  for (const os of ordens) {
    const v = await db.vistorias.where('osId').equals(os.id).first();
    if (!v) continue;

    if (isApiMode() && navigator.onLine) {
      try {
        const synced = await apiClient.patchVistoria(v.id, {
          checklist: v.checklist,
          divergencia: v.divergencia,
          justificativa: v.justificativa,
          checkInLat: v.checkInLat,
          checkInLng: v.checkInLng,
          checkInAt: v.checkInAt,
          concluidaAt: v.concluidaAt,
          syncStatus: 'synced',
        });
        await db.vistorias.put(synced);
        const osRemote = await apiClient.patchOrdem(os.id, 'homologacao');
        await db.ordens.put(osRemote ?? { ...os, status: 'homologacao', updatedAt: t });
        n++;
        continue;
      } catch {
        /* tenta push em lote abaixo */
      }
    }

    await db.vistorias.update(v.id, { syncStatus: 'synced', updatedAt: t });
    await db.ordens.update(os.id, { status: 'homologacao', updatedAt: t });
    n++;
  }

  const fotosN = await syncFotosPendentes();
  await pushApi();
  return n + fotosN;
}

export async function syncFotosPendentes(): Promise<number> {
  if (!isApiMode() || !navigator.onLine) return 0;
  let n = 0;
  for (const f of await listFotosPendentes()) {
    try {
      const file = new File([f.blob], f.filename, { type: f.mime });
      const remote = await apiUploadFoto(f.vistoriaId, file);
      await markFotoSynced(f, remote);
      n++;
    } catch {
      /* tenta na próxima sync */
    }
  }
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

export async function listFotos(vistoriaId: string): Promise<VistoriaFoto[]> {
  const localRows = await db.fotos.where('vistoriaId').equals(vistoriaId).toArray();
  const localMeta = localRows.map(fotoMeta);
  const pendingIds = new Set(localRows.filter((f) => f.syncStatus === 'local').map((f) => f.id));

  if (isApiMode() && navigator.onLine) {
    try {
      const remote = await apiClient.listFotos(vistoriaId);
      const byId = new Map<string, VistoriaFoto>();
      for (const f of remote) byId.set(f.id, f);
      for (const f of localMeta) {
        if (pendingIds.has(f.id)) byId.set(f.id, f);
      }
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return localMeta;
    }
  }
  return localMeta;
}

export async function uploadFoto(vistoriaId: string, file: File): Promise<VistoriaFoto | null> {
  const local = await saveFotoLocal(vistoriaId, file);
  if (isApiMode() && navigator.onLine) {
    try {
      const remote = await apiUploadFoto(vistoriaId, file);
      await markFotoSynced(local, remote);
      return remote;
    } catch {
      return fotoMeta(local);
    }
  }
  return fotoMeta(local);
}

export async function getFotoDisplayUrl(fotoId: string): Promise<string | null> {
  const local = await getFotoLocal(fotoId);
  if (local?.blob) return URL.createObjectURL(local.blob);
  if (isApiMode() && navigator.onLine) {
    try {
      return await apiFotoBlobUrl(fotoId);
    } catch {
      return null;
    }
  }
  return null;
}
