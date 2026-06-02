import type { Demanda, OrdemServico } from '@/types';

let runtimeTenantId = (import.meta.env.VITE_TENANT_ID as string | undefined)?.trim() ?? '';

export function setRuntimeTenantId(id: string) {
  runtimeTenantId = id.trim();
}

export function getRuntimeTenantId(): string {
  return runtimeTenantId;
}

export function matchesTenant(recordTenant?: string): boolean {
  const t = runtimeTenantId;
  if (!t) return true;
  if (!recordTenant) return true;
  return recordTenant === t;
}

export function filterDemandas(list: Demanda[]): Demanda[] {
  return list.filter((d) => matchesTenant(d.tenantId));
}

export function filterOrdens(list: OrdemServico[], demandas: Demanda[]): OrdemServico[] {
  const allowed = new Set(filterDemandas(demandas).map((d) => d.id));
  return list.filter((o) => allowed.has(o.demandaId));
}
