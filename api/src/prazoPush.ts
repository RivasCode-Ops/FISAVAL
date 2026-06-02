import { join } from 'node:path';
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
import { isPrazoNotifyThrottled, saveThrottleState } from './prazoThrottle.js';

function throttlePath() {
  return join(tenantDataDir(), 'prazo-push-state.json');
}

function superThrottlePath() {
  return join(config.dataDir, 'super-prazo-push-state.json');
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
  if (isPrazoNotifyThrottled(path, ordens.length, force)) {
    return { sent: false, count: ordens.length, throttled: true };
  }
  await notifyPrazoVencidoGestores(ordens.length, ordens[0]?.id, ordens[0]?.endereco);
  saveThrottleState(path, ordens.length);
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
  if (isPrazoNotifyThrottled(path, agg.total, force)) {
    return { sent: false, total: agg.total, throttled: true };
  }
  const resumo = agg.tenants.map((t) => `${t.municipio}: ${t.count}`).join('; ');
  await notifySuperAdminPrazoVencido(agg.total, agg.tenantsEmAlerta, resumo);
  saveThrottleState(path, agg.total);
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
