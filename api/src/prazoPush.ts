import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { listarPrazoVencidoNoTenant, aggregateAlertasPrazoCrossTenant } from './alertasPrazo.js';
import {
  isPushEnabled,
  notifyPrazoVencidoGestores,
  notifySuperAdminPrazoVencido,
} from './push.js';
import { ensureTenantReady, runWithTenant } from './tenantContext.js';
import { listTenants } from './tenantRegistry.js';
import { tenantDataDir } from './tenantPaths.js';

type ThrottleState = { lastAt: string; lastCount: number };

function throttlePath() {
  return join(tenantDataDir(), 'prazo-push-state.json');
}

function superThrottlePath() {
  return join(config.dataDir, 'super-prazo-push-state.json');
}

function loadThrottle(p: string): ThrottleState | null {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as ThrottleState;
  } catch {
    return null;
  }
}

function saveThrottle(p: string, count: number) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ lastAt: new Date().toISOString(), lastCount: count }, null, 2));
}

function throttled(p: string, count: number, force: boolean): boolean {
  if (force) return false;
  const prev = loadThrottle(p);
  if (!prev?.lastAt) return false;
  const elapsed = Date.now() - new Date(prev.lastAt).getTime();
  if (elapsed < config.alertaPushIntervalHours * 3_600_000) return true;
  if (prev.lastCount === count && count > 0) return true;
  return false;
}

export async function maybeNotifyPrazoTenant(force = false): Promise<{
  sent: boolean;
  count: number;
  throttled?: boolean;
}> {
  if (!isPushEnabled() || !config.alertaPushEnabled) {
    return { sent: false, count: 0 };
  }
  const ordens = await listarPrazoVencidoNoTenant();
  if (ordens.length < config.alertaPrazoMin) {
    return { sent: false, count: ordens.length };
  }
  const path = throttlePath();
  if (throttled(path, ordens.length, force)) {
    return { sent: false, count: ordens.length, throttled: true };
  }
  await notifyPrazoVencidoGestores(ordens.length, ordens[0]?.id, ordens[0]?.endereco);
  saveThrottle(path, ordens.length);
  return { sent: true, count: ordens.length };
}

export async function maybeNotifySuperPrazo(force = false): Promise<{
  sent: boolean;
  total: number;
  throttled?: boolean;
}> {
  if (!isPushEnabled() || !config.alertaPushEnabled || !config.multiTenant) {
    return { sent: false, total: 0 };
  }
  const agg = await aggregateAlertasPrazoCrossTenant();
  if (agg.total < config.alertaPrazoMin) {
    return { sent: false, total: agg.total };
  }
  const path = superThrottlePath();
  if (throttled(path, agg.total, force)) {
    return { sent: false, total: agg.total, throttled: true };
  }
  const resumo = agg.tenants.map((t) => `${t.municipio}: ${t.count}`).join('; ');
  await notifySuperAdminPrazoVencido(agg.total, agg.tenantsEmAlerta, resumo);
  saveThrottle(path, agg.total);
  return { sent: true, total: agg.total };
}

export async function runPrazoPushCycle(force = false): Promise<void> {
  if (!isPushEnabled() || !config.alertaPushEnabled) return;
  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    await runWithTenant(t.id, () => maybeNotifyPrazoTenant(force));
  }
  await maybeNotifySuperPrazo(force);
}
