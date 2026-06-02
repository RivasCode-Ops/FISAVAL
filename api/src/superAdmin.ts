import { config } from './config.js';
import { getRepo } from './repo.js';
import { ensureTenantReady, runWithTenant } from './tenantContext.js';
import { listTenants } from './tenantRegistry.js';

export function isSuperAdmin(email: string): boolean {
  if (!config.multiTenant) return false;
  return config.superAdminEmails.includes(email.trim().toLowerCase());
}

export type TenantOverviewRow = {
  tenantId: string;
  municipio: string;
  osHoje: number;
  concluidas: number;
  homolog: number;
  divergencias: number;
  visitasHoje: number;
  prazoVencido: number;
  fiscaisAtivos: number;
};

export async function aggregateTenantsOverview(): Promise<{
  tenants: TenantOverviewRow[];
  generatedAt: string;
}> {
  const rows: TenantOverviewRow[] = [];
  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    const kpis = await runWithTenant(t.id, () => getRepo().getKpis());
    rows.push({
      tenantId: t.id,
      municipio: t.municipio,
      osHoje: kpis.osHoje,
      concluidas: kpis.concluidas,
      homolog: kpis.homolog,
      divergencias: kpis.divergencias,
      visitasHoje: kpis.visitasHoje ?? 0,
      prazoVencido: kpis.prazoVencido ?? 0,
      fiscaisAtivos: kpis.fiscais?.length ?? 0,
    });
  }
  return { tenants: rows, generatedAt: new Date().toISOString() };
}
