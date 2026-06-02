import { config, usePostgres } from './config.js';
import { ensureTenantReady } from './tenantContext.js';
import { jsonRepo } from './jsonRepo.js';
import { pgRepo } from './pg.js';

export type Repo = typeof jsonRepo | typeof pgRepo;

export function getRepo(): Repo {
  return usePostgres() ? pgRepo : jsonRepo;
}

export async function ensureStorage() {
  await ensureTenantReady(config.tenantId);
  const repo = getRepo();
  if (repo.mode === 'postgres') await repo.ensureSeed();
}
