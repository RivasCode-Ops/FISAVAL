import { daysUntilPrazo, filtrarOsAtivas } from './rota.js';
import { filterOrdens } from './tenant.js';
import { getRepo } from './repo.js';
import { ensureTenantReady, runWithTenant } from './tenantContext.js';
import { listTenants } from './tenantRegistry.js';
import { config } from './config.js';
import type { OrdemServico } from './types.js';

export type OrdemPrazoAlerta = {
  id: string;
  fiscalNome: string;
  endereco: string;
  bairro: string;
  tipo?: string;
  prazo: string;
  diasAtraso: number;
  status: string;
};

export function ordensComPrazoVencido(ordens: OrdemServico[]): OrdemPrazoAlerta[] {
  return filtrarOsAtivas(ordens)
    .filter((o) => o.prazo && daysUntilPrazo(o.prazo) < 0)
    .map((o) => ({
      id: o.id,
      fiscalNome: o.fiscalNome,
      endereco: o.endereco,
      bairro: o.bairro,
      tipo: o.tipo,
      prazo: o.prazo!.slice(0, 10),
      diasAtraso: -daysUntilPrazo(o.prazo!),
      status: o.status,
    }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso);
}

export async function listarPrazoVencidoNoTenant(): Promise<OrdemPrazoAlerta[]> {
  const repo = getRepo();
  const [ordens, demandas] = await Promise.all([repo.listOrdens(), repo.listDemandas()]);
  return ordensComPrazoVencido(filterOrdens(ordens, demandas));
}

export type TenantAlertaPrazo = {
  tenantId: string;
  municipio: string;
  count: number;
  ordens: OrdemPrazoAlerta[];
};

export async function aggregateAlertasPrazoCrossTenant(): Promise<{
  limiar: number;
  total: number;
  tenantsEmAlerta: number;
  tenants: TenantAlertaPrazo[];
  generatedAt: string;
}> {
  const limiar = config.alertaPrazoMin;
  const tenants: TenantAlertaPrazo[] = [];
  let total = 0;

  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    const ordens = await runWithTenant(t.id, () => listarPrazoVencidoNoTenant());
    total += ordens.length;
    if (ordens.length >= limiar) {
      tenants.push({
        tenantId: t.id,
        municipio: t.municipio,
        count: ordens.length,
        ordens,
      });
    }
  }

  tenants.sort((a, b) => b.count - a.count);
  return {
    limiar,
    total,
    tenantsEmAlerta: tenants.length,
    tenants,
    generatedAt: new Date().toISOString(),
  };
}
