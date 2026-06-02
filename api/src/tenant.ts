import { getActiveTenantId } from './tenantContext.js';
import type { Demanda, OrdemServico } from './types.js';

/** Registros sem tenant (legado) ou com o tenant da instância. */
export function matchesTenant(recordTenant?: string): boolean {
  if (!recordTenant) return true;
  return recordTenant === getActiveTenantId();
}

export function filterDemandas(list: Demanda[]): Demanda[] {
  return list.filter((d) => matchesTenant(d.tenantId));
}

export function filterOrdens(list: OrdemServico[], demandas: Demanda[]): OrdemServico[] {
  const allowed = new Set(filterDemandas(demandas).map((d) => d.id));
  return list.filter((o) => allowed.has(o.demandaId));
}
