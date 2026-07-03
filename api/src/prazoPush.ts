import { join } from 'node:path';
import { config } from './config.js';
import { listarAlertasPrazoNoTenant, aggregateAlertasPrazoCrossTenant } from './alertasPrazo.js';
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
  const alertas = await listarAlertasPrazoNoTenant();
  const count = alertas.ordens.length + alertas.demandas.length;
  if (count < config.alertaPrazoMin) {
    return { sent: false, count };
  }
  const path = throttlePath();
  if (isPrazoNotifyThrottled(path, count, force)) {
    return { sent: false, count, throttled: true };
  }
  const hint = alertas.demandas[0]?.id ?? alertas.ordens[0]?.id;
  const endereco = alertas.ordens[0]?.endereco ?? alertas.demandas[0]?.bairro;
  await notifyPrazoVencidoGestores(count, hint, endereco);
  saveThrottleState(path, count);
  return { sent: true, count };
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
  const total = agg.total + agg.totalDemandas;
  if (total < config.alertaPrazoMin) {
    return { sent: false, total };
  }
  const path = superThrottlePath();
  if (isPrazoNotifyThrottled(path, total, force)) {
    return { sent: false, total, throttled: true };
  }
  const resumo = agg.tenants
    .map((t) => `${t.municipio}: ${t.count} (${t.demandas.length} dem., ${t.ordens.length} OS)`)
    .join('; ');
  await notifySuperAdminPrazoVencido(total, agg.tenantsEmAlerta, resumo);
  saveThrottleState(path, total);
  return { sent: true, total };
}

export async function runPrazoPushCycle(force = false): Promise<void> {
  if (!isPushEnabled() || !config.alertaPushEnabled) return;
  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    await runWithTenant(t.id, () => maybeNotifyPrazoTenant(force));
  }
  await maybeNotifySuperPrazo(force);
}
