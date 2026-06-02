import { db } from '@/db/database';
import type { Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria, VistoriaFoto } from '@/types';
import { getApiUrl } from './config';
import { getStoredTenantId } from './tenantStorage';
import { useAuthStore } from '@/store/authStore';

function headers(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().token;
  if (token) h.Authorization = `Bearer ${token}`;
  const tenant = getStoredTenantId();
  if (tenant) h['X-Tenant-Id'] = tenant;
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
  return api<{
    token: string;
    user: { id: string; email: string; nome: string; role: User['role'] };
    superAdmin?: boolean;
  }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }), headers: headers() });
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
  gerarOs: (
    demandaId: string,
    fiscalId: string,
    fiscalNome: string,
    janela?: { visitaInicio?: string; visitaFim?: string },
  ) =>
    api<OrdemServico>(`/demandas/${demandaId}/gerar-os`, {
      method: 'POST',
      body: JSON.stringify({ fiscalId, fiscalNome, ...janela }),
    }),
  listOrdens: (fiscalId?: string) =>
    api<OrdemServico[]>(fiscalId ? `/ordens?fiscalId=${encodeURIComponent(fiscalId)}` : '/ordens'),
  patchOrdem: (
    id: string,
    patch: { status?: OsStatus; visitaInicio?: string | null; visitaFim?: string | null },
  ) => api<OrdemServico>(`/ordens/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  otimizarRota: (fiscalId: string, start?: { lat: number; lng: number }) =>
    api<{
      ordens: OrdemServico[];
      paradas: number;
      distanciaKm: number;
      duracaoMinEst: number;
      engine: 'vroom' | 'prazo-proximidade';
      visitasHoje?: number;
      capacidadeRestante?: number;
      tiposRota?: string[];
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
  listFiscais: () => api<Omit<User, 'senha'>[]>('/fiscais'),
  patchFiscalTipos: (id: string, tiposHabilitados: string[]) =>
    api<Omit<User, 'senha'>>(`/fiscais/${id}/tipos-habilitados`, {
      method: 'PATCH',
      body: JSON.stringify({ tiposHabilitados }),
    }),
  sugerirFiscal: (tipo: string) =>
    api<{
      tipo: string;
      fiscalId: string | null;
      fiscalNome: string | null;
      carga: { ativas: number; visitasHoje: number } | null;
    }>(`/fiscais/sugerir?tipo=${encodeURIComponent(tipo)}`),
  registrarAssinaturaCertificada: (vistoriaId: string, modo: 'icp' | 'govbr', ref?: string) =>
    api<{ ok: boolean; ref: string; modo: string; vistoria: Vistoria }>(
      `/vistorias/${vistoriaId}/assinatura/certificada`,
      { method: 'POST', body: JSON.stringify({ modo, ref }) },
    ),
  superOverview: () =>
    api<{
      generatedAt: string;
      tenants: {
        tenantId: string;
        municipio: string;
        osHoje: number;
        concluidas: number;
        homolog: number;
        divergencias: number;
        visitasHoje: number;
        prazoVencido: number;
        fiscaisAtivos: number;
        emAlerta?: boolean;
      }[];
    }>('/super/overview'),
  superAlertasPrazo: () =>
    api<{
      limiar: number;
      total: number;
      tenantsEmAlerta: number;
      generatedAt: string;
      tenants: {
        tenantId: string;
        municipio: string;
        count: number;
        ordens: {
          id: string;
          fiscalNome: string;
          endereco: string;
          bairro: string;
          tipo?: string;
          prazo: string;
          diasAtraso: number;
          status: string;
        }[];
      }[];
    }>('/super/alertas/prazo-vencido'),
  alertasPrazoVencido: () =>
    api<{
      count: number;
      generatedAt: string;
      ordens: {
        id: string;
        fiscalNome: string;
        endereco: string;
        bairro: string;
        tipo?: string;
        prazo: string;
        diasAtraso: number;
        status: string;
      }[];
    }>('/alertas/prazo-vencido'),
  getKpis: () =>
    api<{
      osHoje: number;
      concluidas: number;
      homolog: number;
      divergencias: number;
      visitasHoje: number;
      prazoVencido: number;
      fiscais: User[];
    }>('/kpis'),
};
