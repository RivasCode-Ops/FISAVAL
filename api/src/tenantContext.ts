import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';
import { isAllowedTenant, municipioForTenant } from './tenantRegistry.js';
import { migrateLegacyTenantData } from './tenantPaths.js';
import { usePostgres } from './config.js';

const storage = new AsyncLocalStorage<{ tenantId: string }>();
const readyTenants = new Set<string>();

export function getActiveTenantId(): string {
  return storage.getStore()?.tenantId ?? config.tenantId;
}

export function getActiveMunicipioNome(): string {
  return municipioForTenant(getActiveTenantId());
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

export async function ensureTenantReady(tenantId: string): Promise<void> {
  if (readyTenants.has(tenantId)) return;
  readyTenants.add(tenantId);
  await runWithTenant(tenantId, async () => {
    migrateLegacyTenantData();
    if (!usePostgres()) {
      const { jsonRepo } = await import('./jsonRepo.js');
      await jsonRepo.ensureSeed();
    }
  });
}

function resolveRequestTenant(req: Request): string | null {
  const raw = req.headers['x-tenant-id'];
  const fromHeader = (typeof raw === 'string' ? raw : raw?.[0])?.trim();
  const id = (fromHeader || config.tenantId).toLowerCase();
  return isAllowedTenant(id) ? id : null;
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = resolveRequestTenant(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant inválido (header X-Tenant-Id)' });
    return;
  }
  void ensureTenantReady(tenantId)
    .then(() => {
      runWithTenant(tenantId, () => next());
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Erro ao preparar tenant' });
    });
}
