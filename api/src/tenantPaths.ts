import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { getActiveTenantId } from './tenantContext.js';

/** Dados separados por `TENANT_ID` (padrão ligado). Defina `TENANT_ISOLATED=0` para modo legado. */
export function tenantIsolated(): boolean {
  const v = process.env.TENANT_ISOLATED;
  return v !== '0' && v !== 'false';
}

export function tenantDataDir(): string {
  if (!tenantIsolated()) return config.dataDir;
  return join(config.dataDir, 'tenants', getActiveTenantId());
}

export function tenantDbPath(): string {
  return join(tenantDataDir(), 'fisaval.json');
}

export function tenantAuditPath(): string {
  return join(tenantDataDir(), 'audit-log.json');
}

export function tenantPushSubsPath(): string {
  return join(tenantDataDir(), 'push-subs.json');
}

export function tenantUploadsDir(): string {
  if (!tenantIsolated()) return config.uploadsDir;
  return join(config.uploadsDir, getActiveTenantId());
}

/** Copia `fisaval.json` / auditoria / push da raiz para a pasta do tenant (uma vez). */
export function migrateLegacyTenantData() {
  if (!tenantIsolated()) return;
  const dir = tenantDataDir();
  mkdirSync(dir, { recursive: true });
  mkdirSync(tenantUploadsDir(), { recursive: true });

  const pairs: [string, string][] = [
    [join(config.dataDir, 'fisaval.json'), tenantDbPath()],
    [join(config.dataDir, 'audit-log.json'), tenantAuditPath()],
    [join(config.dataDir, 'push-subs.json'), tenantPushSubsPath()],
  ];
  for (const [legacy, target] of pairs) {
    if (existsSync(legacy) && !existsSync(target)) {
      copyFileSync(legacy, target);
    }
  }
}
