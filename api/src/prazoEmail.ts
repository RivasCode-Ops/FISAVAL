import { join } from 'node:path';
import { config } from './config.js';
import { listarPrazoVencidoNoTenant, aggregateAlertasPrazoCrossTenant } from './alertasPrazo.js';
import type { OrdemPrazoAlerta } from './alertasPrazo.js';
import { getRepo } from './repo.js';
import { sendMail, isSmtpEnabled } from './smtp.js';
import {
  ensureTenantReady,
  runWithTenant,
  getActiveMunicipioNome,
  getActiveTenantId,
} from './tenantContext.js';
import { listTenants } from './tenantRegistry.js';
import { tenantDataDir } from './tenantPaths.js';
import { isPrazoNotifyThrottled, saveThrottleState } from './prazoThrottle.js';

function throttlePathEmail() {
  return join(tenantDataDir(), 'prazo-email-state.json');
}

function superThrottlePathEmail() {
  return join(config.dataDir, 'super-prazo-email-state.json');
}

function formatOrdensLista(ordens: OrdemPrazoAlerta[]): string {
  return ordens
    .slice(0, 25)
    .map(
      (o) =>
        `- ${o.id} | ${o.fiscalNome} | ${o.endereco} | prazo ${o.prazo} | ${o.diasAtraso} dia(s) atraso`,
    )
    .join('\n');
}

async function emailsGestoresTenant(): Promise<string[]> {
  const extra = config.alertaEmailTo;
  const bootstrap = await getRepo().bootstrap();
  const fromUsers = bootstrap.users
    .filter((u) => u.role === 'gestor' || u.role === 'admin')
    .map((u) => u.email.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  return [...new Set([...fromUsers, ...extra])];
}

function emailsSuperAdmin(): string[] {
  const extra = config.alertaEmailSuper;
  return [...new Set([...config.superAdminEmails, ...extra])];
}

export async function maybeEmailPrazoTenant(force = false): Promise<{
  sent: boolean;
  count: number;
  recipients?: number;
  throttled?: boolean;
}> {
  if (!isSmtpEnabled()) return { sent: false, count: 0 };
  const ordens = await listarPrazoVencidoNoTenant();
  if (ordens.length < config.alertaPrazoMin) {
    return { sent: false, count: ordens.length };
  }
  const path = throttlePathEmail();
  if (isPrazoNotifyThrottled(path, ordens.length, force)) {
    return { sent: false, count: ordens.length, throttled: true };
  }
  const to = await emailsGestoresTenant();
  const municipio = getActiveMunicipioNome();
  const tenantId = getActiveTenantId();
  const { sent } = await sendMail({
    to,
    subject: `FISAVAL — ${ordens.length} OS com prazo vencido (${municipio})`,
    text: [
      `Prefeitura: ${municipio} (tenant: ${tenantId})`,
      `${ordens.length} ordem(ns) de serviço ativa(s) com prazo vencido:`,
      '',
      formatOrdensLista(ordens),
      ordens.length > 25 ? `\n… e mais ${ordens.length - 25} OS.` : '',
      '',
      'Acesse o painel FISAVAL para tratar as pendências.',
    ].join('\n'),
  });
  if (sent > 0) saveThrottleState(path, ordens.length);
  return { sent: sent > 0, count: ordens.length, recipients: to.length };
}

export async function maybeEmailSuperPrazo(force = false): Promise<{
  sent: boolean;
  total: number;
  throttled?: boolean;
}> {
  if (!isSmtpEnabled() || !config.multiTenant) {
    return { sent: false, total: 0 };
  }
  const agg = await aggregateAlertasPrazoCrossTenant();
  if (agg.total < config.alertaPrazoMin) {
    return { sent: false, total: agg.total };
  }
  const path = superThrottlePathEmail();
  if (isPrazoNotifyThrottled(path, agg.total, force)) {
    return { sent: false, total: agg.total, throttled: true };
  }
  const lines: string[] = [
    `${agg.total} OS com prazo vencido em ${agg.tenantsEmAlerta} prefeitura(s):`,
    '',
  ];
  for (const t of agg.tenants) {
    lines.push(`## ${t.municipio} (${t.tenantId}) — ${t.count} OS`);
    lines.push(formatOrdensLista(t.ordens));
    lines.push('');
  }
  const { sent } = await sendMail({
    to: emailsSuperAdmin(),
    subject: `FISAVAL Global — ${agg.total} OS com prazo vencido`,
    text: lines.join('\n'),
  });
  if (sent > 0) saveThrottleState(path, agg.total);
  return { sent: sent > 0, total: agg.total };
}

export async function runPrazoEmailCycle(force = false): Promise<void> {
  if (!isSmtpEnabled()) return;
  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    await runWithTenant(t.id, () => maybeEmailPrazoTenant(force));
  }
  await maybeEmailSuperPrazo(force);
}
