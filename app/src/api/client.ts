import { db } from '@/db/database';
import type { Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria, VistoriaFoto } from '@/types';
import { getApiUrl } from './config';
import { useAuthStore } from '@/store/authStore';

function headers(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().token;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiUrl();
  if (!base) throw new Error('API não configurada');
  const res = await fetch(`${base}/api/fisaval${path}`, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiLogin(email: string, senha: string) {
  return api<{ token: string; user: { id: string; email: string; nome: string; role: User['role'] } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, senha }), headers: headers() },
  );
}

export async function apiBootstrap() {
  return api<{
    users: Omit<User, 'senha'>[];
    demandas: Demanda[];
    ordens: OrdemServico[];
    vistorias: Vistoria[];
    fotos: VistoriaFoto[];
  }>('/bootstrap');
}

export async function hydrateDexieFromApi() {
  const data = await apiBootstrap();
  const fotosPendentes = await db.fotos.where('syncStatus').equals('local').toArray();
  await db.transaction('rw', [db.users, db.demandas, db.ordens, db.vistorias, db.fotos], async () => {
    await db.users.clear();
    await db.demandas.clear();
    await db.ordens.clear();
    await db.vistorias.clear();
    await db.fotos.clear();
    await db.users.bulkAdd(data.users.map((u) => ({ ...u, senha: '' })));
    await db.demandas.bulkAdd(data.demandas);
    await db.ordens.bulkAdd(data.ordens);
    await db.vistorias.bulkAdd(data.vistorias);
    if (fotosPendentes.length) await db.fotos.bulkAdd(fotosPendentes);
  });
}

export async function apiPushState() {
  const [demandas, ordens, vistorias] = await Promise.all([
    db.demandas.toArray(),
    db.ordens.toArray(),
    db.vistorias.toArray(),
  ]);
  await api('/sync/replace', {
    method: 'POST',
    body: JSON.stringify({ demandas, ordens, vistorias }),
  });
}

export async function apiUploadFoto(vistoriaId: string, file: File): Promise<VistoriaFoto> {
  const base = getApiUrl();
  if (!base) throw new Error('API não configurada');
  const fd = new FormData();
  fd.append('file', file);
  const token = useAuthStore.getState().token;
  const res = await fetch(`${base}/api/fisaval/vistorias/${vistoriaId}/fotos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error('Falha no upload');
  return res.json() as Promise<VistoriaFoto>;
}

export async function apiUploadAssinatura(vistoriaId: string, blob: Blob): Promise<void> {
  const base = getApiUrl();
  if (!base) throw new Error('API não configurada');
  const fd = new FormData();
  fd.append('file', blob, 'assinatura.png');
  const token = useAuthStore.getState().token;
  const res = await fetch(`${base}/api/fisaval/vistorias/${vistoriaId}/assinatura`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error('Falha no upload da assinatura');
}

export async function apiAssinaturaBlobUrl(vistoriaId: string): Promise<string | null> {
  const base = getApiUrl();
  const token = useAuthStore.getState().token;
  const res = await fetch(`${base}/api/fisaval/vistorias/${vistoriaId}/assinatura/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function apiFotoBlobUrl(fotoId: string): Promise<string> {
  const base = getApiUrl();
  const token = useAuthStore.getState().token;
  const res = await fetch(`${base}/api/fisaval/fotos/${fotoId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Foto indisponível');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export const apiClient = {
  listDemandas: () => api<Demanda[]>('/demandas'),
  createDemanda: (body: object) => api<Demanda>('/demandas', { method: 'POST', body: JSON.stringify(body) }),
  gerarOs: (demandaId: string, fiscalId: string, fiscalNome: string) =>
    api<OrdemServico>(`/demandas/${demandaId}/gerar-os`, {
      method: 'POST',
      body: JSON.stringify({ fiscalId, fiscalNome }),
    }),
  listOrdens: (fiscalId?: string) =>
    api<OrdemServico[]>(fiscalId ? `/ordens?fiscalId=${encodeURIComponent(fiscalId)}` : '/ordens'),
  patchOrdem: (id: string, status: OsStatus) =>
    api<OrdemServico>(`/ordens/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  otimizarRota: (fiscalId: string, start?: { lat: number; lng: number }) =>
    api<{
      ordens: OrdemServico[];
      paradas: number;
      distanciaKm: number;
      duracaoMinEst: number;
      engine: 'vroom' | 'proximidade';
    }>('/ordens/otimizar-rota', {
      method: 'POST',
      body: JSON.stringify({
        fiscalId,
        startLat: start?.lat,
        startLng: start?.lng,
      }),
    }),
  homologar: (id: string, aprovado: boolean) =>
    api<{ ok: boolean }>(`/ordens/${id}/homologar`, { method: 'POST', body: JSON.stringify({ aprovado }) }),
  getVistoria: (osId: string) => api<Vistoria | null>(`/vistorias?osId=${encodeURIComponent(osId)}`),
  createVistoria: (osId: string) => api<Vistoria>('/vistorias', { method: 'POST', body: JSON.stringify({ osId }) }),
  patchVistoria: (id: string, body: object) =>
    api<Vistoria>(`/vistorias/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listFotos: (vistoriaId: string) => api<VistoriaFoto[]>(`/vistorias/${vistoriaId}/fotos`),
  listFiscais: () => api<{ id: string; nome: string; email: string; role: string }[]>('/fiscais'),
  getKpis: () => api<{ osHoje: number; concluidas: number; homolog: number; divergencias: number; fiscais: User[] }>('/kpis'),
};
