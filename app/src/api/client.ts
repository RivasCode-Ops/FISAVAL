import { db } from '@/db/database';
import type { Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria } from '@/types';
import { getApiUrl } from './config';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiUrl();
  if (!base) throw new Error('API não configurada');
  const res = await fetch(`${base}/api/fisaval${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiLogin(email: string, senha: string) {
  return api<{ user: { id: string; email: string; nome: string; role: User['role'] } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export async function apiBootstrap() {
  return api<{
    users: Omit<User, 'senha'>[];
    demandas: Demanda[];
    ordens: OrdemServico[];
    vistorias: Vistoria[];
  }>('/bootstrap');
}

export async function hydrateDexieFromApi() {
  const data = await apiBootstrap();
  await db.transaction('rw', db.users, db.demandas, db.ordens, db.vistorias, async () => {
    await db.users.clear();
    await db.demandas.clear();
    await db.ordens.clear();
    await db.vistorias.clear();
    await db.users.bulkAdd(
      data.users.map((u) => ({
        ...u,
        senha: '',
      })),
    );
    await db.demandas.bulkAdd(data.demandas);
    await db.ordens.bulkAdd(data.ordens);
    await db.vistorias.bulkAdd(data.vistorias);
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
  homologar: (id: string, aprovado: boolean) =>
    api<{ ok: boolean }>(`/ordens/${id}/homologar`, { method: 'POST', body: JSON.stringify({ aprovado }) }),
  getVistoria: (osId: string) => api<Vistoria | null>(`/vistorias?osId=${encodeURIComponent(osId)}`),
  createVistoria: (osId: string) => api<Vistoria>('/vistorias', { method: 'POST', body: JSON.stringify({ osId }) }),
  patchVistoria: (id: string, body: object) =>
    api<Vistoria>(`/vistorias/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listFiscais: () => api<{ id: string; nome: string; email: string; role: string }[]>('/fiscais'),
  getKpis: () => api<{ osHoje: number; concluidas: number; homolog: number; divergencias: number; fiscais: User[] }>('/kpis'),
};
