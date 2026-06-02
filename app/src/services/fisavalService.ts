import {
  apiAssinaturaBlobUrl,
  apiClient,
  apiFotoBlobUrl,
  apiPushState,
  apiUploadAssinatura,
  apiUploadFoto,
  hydrateDexieFromApi,
} from '@/api/client';
import {
  getAssinatura,
  getAssinaturaObjectUrl,
  listAssinaturasPendentes,
  markAssinaturaSynced,
  saveAssinaturaLocal,
} from '@/db/assinaturas';
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
import { parseDemandasCsvText } from '@/lib/csvParse';
import { filterDemandas, filterOrdens, getRuntimeTenantId } from '@/lib/tenantFilter';
import {
  estimateRotaStats,
  filtrarOsAtivas,
  ordenarPorPrazoEProximidade,
  prazoVencido,
  type GeoPoint,
} from '@/lib/rota';

export type OtimizarRotaResult = {
  paradas: number;
  distanciaKm: number;
  duracaoMinEst: number;
  engine: 'vroom' | 'prazo-proximidade';
  capacidadeRestante?: number;
  tiposRota?: string[];
};
import { getApiUrl } from '@/api/config';
import { useAuthStore } from '@/store/authStore';
import { vistoriaTemAssinatura } from '@/lib/vistoriaAssinatura';
import { buildFiscalCargaLocal, pickFiscalIdLocal } from '@/lib/sugerirFiscal';
import { fiscalHandlesTipo } from '@/lib/tipoVistoria';
import type { Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria, VistoriaFoto } from '@/types';

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
export async function importDemandasCsvFile(file: File): Promise<{ created: number; errors: string[] }> {
  const text = await file.text();
  const { rows, errors } = parseDemandasCsvText(text);
  if (!rows.length) return { created: 0, errors: errors.length ? errors : ['Nenhuma linha válida'] };

  if (isApiMode() && navigator.onLine) {
    const base = getApiUrl();
    const token = useAuthStore.getState().token;
    if (base && token) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${base}/api/fisaval/import/demandas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { created?: number; errors?: string[]; error?: string };
      if (!res.ok) return { created: 0, errors: [data.error ?? 'Falha na importação'] };
      await refreshFromServer();
      return { created: data.created ?? 0, errors: [...errors, ...(data.errors ?? [])] };
    }
  }

  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await createDemanda({
      tipo: r.tipo,
      bairro: r.bairro,
      prioridade: r.prioridade,
      prazo: r.prazo,
      endereco: r.endereco,
      inscricao: r.inscricao,
      lat: r.lat ?? -23.55 + i * 0.001,
      lng: r.lng ?? -46.633 + i * 0.001,
    });
    created++;
  }
  await pushApi();
  return { created, errors };
}

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
  const list = await db.demandas.orderBy('updatedAt').reverse().toArray();
  return filterDemandas(list);
}

async function listOrdensTenantScoped(): Promise<OrdemServico[]> {
  const demandas = await db.demandas.toArray();
  return filterOrdens(await db.ordens.toArray(), demandas);
}

export async function getVistoriaMapByOs(): Promise<Map<string, Vistoria>> {
  const list = await db.vistorias.toArray();
  const m = new Map<string, Vistoria>();
  for (const v of list) m.set(v.osId, v);
  return m;
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
      tenantId: getRuntimeTenantId() || undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.demandas.add(d);
    await pushApi();
  }
  return d;
}

export async function gerarOs(
  demandaId: string,
  fiscalId: string,
  fiscalNome: string,
  janela?: { visitaInicio?: string; visitaFim?: string },
) {
  if (isApiMode() && navigator.onLine) {
    try {
      const os = await apiClient.gerarOs(demandaId, fiscalId, fiscalNome, janela);
      await db.ordens.put(os);
      const demanda = await db.demandas.get(demandaId);
      if (demanda) await db.demandas.put({ ...demanda, status: 'os_gerada', updatedAt: now() });
      return os;
    } catch (e) {
      throw e instanceof Error ? e : new Error('Não foi possível gerar a OS');
    }
  }
  const demanda = await db.demandas.get(demandaId);
  if (!demanda) throw new Error('Demanda não encontrada');
  const fiscal = await db.users.get(fiscalId);
  if (!fiscalHandlesTipo(fiscal?.tiposHabilitados, demanda.tipo)) {
    throw new Error(`Fiscal não habilitado para o tipo "${demanda.tipo}"`);
  }
  const count = await db.ordens.where('fiscalId').equals(fiscalId).count();
  const os: OrdemServico = {
    id: uid('OS'),
    demandaId,
    fiscalId,
    fiscalNome,
    inscricao: demanda.inscricao ?? '—',
    endereco: demanda.endereco ?? demanda.bairro,
    bairro: demanda.bairro,
    tipo: demanda.tipo,
    prioridade: demanda.prioridade,
    prazo: demanda.prazo,
    visitaInicio: janela?.visitaInicio,
    visitaFim: janela?.visitaFim,
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
  const list = (await listOrdensTenantScoped()).filter((o) => o.fiscalId === fiscalId);
  return list.sort((a, b) => a.rotaOrdem - b.rotaOrdem || a.updatedAt.localeCompare(b.updatedAt));
}

export async function getVistoriaForOs(osId: string) {
  return db.vistorias.where('osId').equals(osId).first();
}

export async function otimizarRotaFiscal(
  fiscalId: string,
  start?: GeoPoint,
): Promise<OtimizarRotaResult> {
  if (isApiMode() && navigator.onLine) {
    try {
      const r = await apiClient.otimizarRota(fiscalId, start);
      for (const o of r.ordens) await db.ordens.put(o);
      return {
        paradas: r.paradas,
        distanciaKm: r.distanciaKm,
        duracaoMinEst: r.duracaoMinEst,
        engine: r.engine,
        capacidadeRestante: r.capacidadeRestante,
        tiposRota: r.tiposRota,
      };
    } catch {
      /* fallback local */
    }
  }

  const ativas = filtrarOsAtivas(
    (await listOrdensTenantScoped()).filter((o) => o.fiscalId === fiscalId),
  );
  if (!ativas.length) {
    return { paradas: 0, distanciaKm: 0, duracaoMinEst: 0, engine: 'prazo-proximidade' };
  }

  const origin = start ?? { lat: ativas[0].lat, lng: ativas[0].lng };
  const ordered = ativas.length >= 2 ? ordenarPorPrazoEProximidade(ativas, origin) : ativas;
  const stats = estimateRotaStats(ordered, origin);
  const t = now();
  await db.transaction('rw', [db.ordens], async () => {
    for (let i = 0; i < ordered.length; i++) {
      await db.ordens.update(ordered[i].id, { rotaOrdem: i + 1, updatedAt: t });
    }
  });
  await pushApi();
  return {
    paradas: ordered.length,
    distanciaKm: stats.distanciaKm,
    duracaoMinEst: stats.duracaoMinEst,
    engine: 'prazo-proximidade',
    tiposRota: [...new Set(ordered.map((o) => o.tipo).filter(Boolean))] as string[],
  };
}

export async function listAllOrdens() {
  const list = await listOrdensTenantScoped();
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateOsStatus(osId: string, status: OsStatus) {
  if (isApiMode() && navigator.onLine) {
    const os = await apiClient.patchOrdem(osId, { status });
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
    await apiClient.patchOrdem(osId, { status: 'pendente_sync' });
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
          assinaturaAt: v.assinaturaAt,
          assinaturaNome: v.assinaturaNome,
          syncStatus: 'synced',
        });
        await db.vistorias.put(synced);
        const osRemote = await apiClient.patchOrdem(os.id, { status: 'homologacao' });
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
  const assN = await syncAssinaturasPendentes();
  await pushApi();
  return n + fotosN + assN;
}

export async function hasAssinatura(vistoriaId: string): Promise<boolean> {
  const v = await db.vistorias.get(vistoriaId);
  const local = await getAssinatura(vistoriaId);
  if (vistoriaTemAssinatura(v, !!local)) return true;
  if (isApiMode() && navigator.onLine) {
    const url = await apiAssinaturaBlobUrl(vistoriaId);
    return vistoriaTemAssinatura(v, !!url);
  }
  return false;
}

export async function registrarAssinaturaCertificada(
  vistoriaId: string,
  fiscalNome: string,
  modo: 'icp' | 'govbr',
): Promise<Vistoria | null> {
  const t = now();
  if (isApiMode() && navigator.onLine) {
    try {
      const r = await apiClient.registrarAssinaturaCertificada(vistoriaId, modo);
      await db.vistorias.put(r.vistoria);
      return r.vistoria;
    } catch {
      /* local */
    }
  }
  const v = await db.vistorias.get(vistoriaId);
  if (!v) return null;
  const ref = `DEMO-${modo.toUpperCase()}-${Date.now().toString(36)}`;
  const next: Vistoria = {
    ...v,
    assinaturaAt: t,
    assinaturaNome: fiscalNome,
    assinaturaModo: modo,
    assinaturaRef: ref,
    updatedAt: t,
  };
  await db.vistorias.put(next);
  await pushApi();
  return next;
}

export async function getAssinaturaDisplayUrl(vistoriaId: string): Promise<string | null> {
  const local = await getAssinaturaObjectUrl(vistoriaId);
  if (local) return local;
  if (isApiMode() && navigator.onLine) return apiAssinaturaBlobUrl(vistoriaId);
  return null;
}

export async function saveAssinatura(vistoriaId: string, fiscalNome: string, blob: Blob) {
  const t = now();
  await saveAssinaturaLocal(vistoriaId, fiscalNome, blob);
  await db.vistorias.update(vistoriaId, {
    assinaturaAt: t,
    assinaturaNome: fiscalNome,
    assinaturaModo: 'canvas',
    assinaturaRef: undefined,
    updatedAt: t,
  });
  if (isApiMode() && navigator.onLine) {
    try {
      await apiUploadAssinatura(vistoriaId, blob);
      await markAssinaturaSynced(vistoriaId);
      const v = await apiClient.patchVistoria(vistoriaId, { assinaturaAt: t, assinaturaNome: fiscalNome });
      await db.vistorias.put(v);
    } catch {
      /* sync depois */
    }
  }
}

export async function syncAssinaturasPendentes(): Promise<number> {
  if (!isApiMode() || !navigator.onLine) return 0;
  let n = 0;
  for (const a of await listAssinaturasPendentes()) {
    try {
      await apiUploadAssinatura(a.vistoriaId, a.blob);
      await markAssinaturaSynced(a.vistoriaId);
      await apiClient.patchVistoria(a.vistoriaId, {
        assinaturaAt: a.createdAt,
        assinaturaNome: a.fiscalNome,
      });
      n++;
    } catch {
      /* retry */
    }
  }
  return n;
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
  const ordens = await listOrdensTenantScoped();
  const osIds = new Set(ordens.map((o) => o.id));
  const hoje = new Date().toISOString().slice(0, 10);
  const osHoje = ordens.filter((o) => o.createdAt.startsWith(hoje)).length;
  const concluidas = ordens.filter((o) =>
    ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status),
  ).length;
  const homolog = ordens.filter((o) => o.status === 'homologacao').length;
  const vistorias = await db.vistorias.toArray();
  const divergencias = vistorias.filter((v) => v.divergencia && osIds.has(v.osId)).length;
  const fiscais = await db.users.where('role').equals('fiscal').toArray();
  const visitasHoje = vistorias.filter((v) => osIds.has(v.osId) && v.concluidaAt?.startsWith(hoje)).length;
  const prazoVencidoCount = filtrarOsAtivas(ordens).filter((o) => o.prazo && prazoVencido(o.prazo)).length;
  return {
    osHoje: osHoje || ordens.length,
    concluidas,
    homolog,
    divergencias,
    visitasHoje,
    prazoVencido: prazoVencidoCount,
    fiscais,
  };
}

export async function sugerirFiscalParaTipo(tipo: string): Promise<string | null> {
  if (isApiMode() && navigator.onLine) {
    try {
      const r = await apiClient.sugerirFiscal(tipo);
      return r.fiscalId;
    } catch {
      /* Dexie */
    }
  }
  const fiscais = await listFiscais();
  const ordens = await listOrdensTenantScoped();
  const vistorias = await db.vistorias.toArray();
  const carga = buildFiscalCargaLocal(fiscais, ordens, vistorias);
  return pickFiscalIdLocal(fiscais, tipo, carga);
}

export async function listFiscais(): Promise<Omit<User, 'senha'>[]> {
  if (isApiMode() && navigator.onLine) {
    try {
      return await apiClient.listFiscais();
    } catch {
      /* Dexie */
    }
  }
  return db.users.where('role').equals('fiscal').toArray();
}

export async function updateFiscalTipos(fiscalId: string, tiposHabilitados: string[]) {
  if (isApiMode() && navigator.onLine) {
    const u = await apiClient.patchFiscalTipos(fiscalId, tiposHabilitados);
    const cur = await db.users.get(fiscalId);
    if (cur) {
      await db.users.put({
        ...cur,
        tiposHabilitados: u.tiposHabilitados,
      });
    }
    return u;
  }
  const cur = await db.users.get(fiscalId);
  if (!cur || cur.role !== 'fiscal') throw new Error('Fiscal não encontrado');
  const next = {
    ...cur,
    tiposHabilitados: tiposHabilitados.length ? tiposHabilitados : undefined,
  };
  await db.users.put(next);
  const { senha: _, ...rest } = next;
  return rest;
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
