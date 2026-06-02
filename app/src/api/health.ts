import { getApiUrl } from './config';

export type ApiHealth = {
  ok: boolean;
  storage?: string;
  version?: string;
  error?: string;
};

export async function pingApiHealth(): Promise<ApiHealth> {
  const base = getApiUrl();
  if (!base) return { ok: false, error: 'API não configurada' };
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { ok?: boolean; storage?: string; version?: string };
    return { ok: !!data.ok, storage: data.storage, version: data.version };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha de rede' };
  }
}
