import { filtrarOsAtivas } from './rota.js';
import {
  calcPrazoDemanda,
  calcPrazoOs,
  resolvePrazoCampo,
  resolvePrazoVistoria,
  type PrazoCalculado,
} from './prazoStatus.js';
import { ensureTenantReady, runWithTenant } from './tenantContext.js';
import { listTenants } from './tenantRegistry.js';
import { config } from './config.js';
import type { Demanda, OrdemServico, StatusPrazo, Vistoria } from './types.js';

export type DemandaPrazoAlerta = {
  id: string;
  tipo?: string;
  finalidade?: string;
  bairro: string;
  prazo: string;
  diasAtraso: number;
  diasRestantes: number;
  statusPrazo: StatusPrazo;
  labelCurto: string;
  status: string;
};

export type OrdemPrazoAlerta = {
  id: string;
  fiscalNome: string;
  endereco: string;
  bairro: string;
  tipo?: string;
  prazo: string;
  diasAtraso: number;
  diasRestantes: number;
  statusPrazo: StatusPrazo;
  labelCurto: string;
  status: string;
};

export type AlertasPrazoResult = {
  demandas: DemandaPrazoAlerta[];
  ordens: OrdemPrazoAlerta[];
  generatedAt: string;
};

const ALERTA_STATUS: StatusPrazo[] = ['VENCIDA', 'A_VENCER'];

function toDemandaAlerta(d: Demanda, calc: PrazoCalculado): DemandaPrazoAlerta {
  const prazo = resolvePrazoVistoria(d)!;
  return {
    id: d.id,
    tipo: d.tipo,
    finalidade: d.finalidade ?? d.tipo,
    bairro: d.bairro,
    prazo: prazo.slice(0, 10),
    diasAtraso: calc.diasEmAtraso,
    diasRestantes: calc.diasRestantes,
    statusPrazo: calc.statusPrazo,
    labelCurto: calc.labelCurto,
    status: d.status,
  };
}

function toOrdemAlerta(o: OrdemServico, calc: PrazoCalculado): OrdemPrazoAlerta {
  const prazo = resolvePrazoCampo(o)!;
  return {
    id: o.id,
    fiscalNome: o.fiscalNome,
    endereco: o.endereco,
    bairro: o.bairro,
    tipo: o.tipo,
    prazo: prazo.slice(0, 10),
    diasAtraso: calc.diasEmAtraso,
    diasRestantes: calc.diasRestantes,
    statusPrazo: calc.statusPrazo,
    labelCurto: calc.labelCurto,
    status: o.status,
  };
}

export function demandasComPrazoAlerta(demandas: Demanda[]): DemandaPrazoAlerta[] {
  return demandas
    .filter((d) => d.status === 'aberta' && resolvePrazoVistoria(d))
    .map((d) => toDemandaAlerta(d, calcPrazoDemanda(d)))
    .filter((a) => ALERTA_STATUS.includes(a.statusPrazo))
    .sort((a, b) => {
      if (a.statusPrazo === 'VENCIDA' && b.statusPrazo !== 'VENCIDA') return -1;
      if (b.statusPrazo === 'VENCIDA' && a.statusPrazo !== 'VENCIDA') return 1;
      return b.diasAtraso - a.diasAtraso || a.diasRestantes - b.diasRestantes;
    });
}

export function ordensComPrazoAlerta(
  ordens: OrdemServico[],
  vistoriaByOs?: Map<string, Vistoria>,
): OrdemPrazoAlerta[] {
  return filtrarOsAtivas(ordens)
    .filter((o) => resolvePrazoCampo(o))
    .map((o) => toOrdemAlerta(o, calcPrazoOs(o, vistoriaByOs?.get(o.id))))
    .filter((a) => {
      const v = vistoriaByOs?.get(a.id);
      if (v?.checkInAt) return false;
      return ALERTA_STATUS.includes(a.statusPrazo);
    })
    .sort((a, b) => {
      if (a.statusPrazo === 'VENCIDA' && b.statusPrazo !== 'VENCIDA') return -1;
      if (b.statusPrazo === 'VENCIDA' && a.statusPrazo !== 'VENCIDA') return 1;
      return b.diasAtraso - a.diasAtraso || a.diasRestantes - b.diasRestantes;
    });
}

/** @deprecated Use ordensComPrazoAlerta */
export function ordensComPrazoVencido(ordens: OrdemServico[], vistoriaByOs?: Map<string, Vistoria>): OrdemPrazoAlerta[] {
  return ordensComPrazoAlerta(ordens, vistoriaByOs);
}

export function countDemandasVencidas(demandas: Demanda[]): number {
  return demandasComPrazoAlerta(demandas).filter((d) => d.statusPrazo === 'VENCIDA').length;
}

export function countOrdensCampoVencidas(
  ordens: OrdemServico[],
  vistoriaByOs?: Map<string, Vistoria>,
): number {
  return ordensComPrazoAlerta(ordens, vistoriaByOs).filter((o) => o.statusPrazo === 'VENCIDA').length;
}

export async function listarAlertasPrazoNoTenant(): Promise<AlertasPrazoResult> {
  const { getRepo } = await import('./repo.js');
  const { filterOrdens } = await import('./tenant.js');
  const repo = getRepo();
  const [ordens, demandas, boot] = await Promise.all([
    repo.listOrdens(),
    repo.listDemandas(),
    repo.bootstrap(),
  ]);
  const scopedOrdens = filterOrdens(ordens, demandas);
  const vMap = new Map<string, Vistoria>();
  for (const v of boot.vistorias) vMap.set(v.osId, v);
  return {
    demandas: demandasComPrazoAlerta(demandas),
    ordens: ordensComPrazoAlerta(scopedOrdens, vMap),
    generatedAt: new Date().toISOString(),
  };
}

export async function listarPrazoVencidoNoTenant(): Promise<OrdemPrazoAlerta[]> {
  const r = await listarAlertasPrazoNoTenant();
  return r.ordens;
}

export type TenantAlertaPrazo = {
  tenantId: string;
  municipio: string;
  count: number;
  ordens: OrdemPrazoAlerta[];
  demandas: DemandaPrazoAlerta[];
};

export async function aggregateAlertasPrazoCrossTenant(): Promise<{
  limiar: number;
  total: number;
  totalDemandas: number;
  tenantsEmAlerta: number;
  tenants: TenantAlertaPrazo[];
  generatedAt: string;
}> {
  const limiar = config.alertaPrazoMin;
  const tenants: TenantAlertaPrazo[] = [];
  let total = 0;
  let totalDemandas = 0;

  for (const t of listTenants()) {
    await ensureTenantReady(t.id);
    const alertas = await runWithTenant(t.id, () => listarAlertasPrazoNoTenant());
    total += alertas.ordens.length;
    totalDemandas += alertas.demandas.length;
    const count = alertas.ordens.length + alertas.demandas.length;
    if (count >= limiar) {
      tenants.push({
        tenantId: t.id,
        municipio: t.municipio,
        count,
        ordens: alertas.ordens,
        demandas: alertas.demandas,
      });
    }
  }

  tenants.sort((a, b) => b.count - a.count);
  return {
    limiar,
    total,
    totalDemandas,
    tenantsEmAlerta: tenants.length,
    tenants,
    generatedAt: new Date().toISOString(),
  };
}
