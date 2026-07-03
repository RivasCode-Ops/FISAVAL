import { filtrarOsAtivas } from '@/lib/rota';
import {
  calcPrazoDemanda,
  calcPrazoOs,
  resolvePrazoCampo,
  resolvePrazoVistoria,
  type PrazoCalculado,
} from '@/lib/prazoStatus';
import type { Demanda, OrdemServico, StatusPrazo, Vistoria } from '@/types';

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
    .map((o) => {
      const v = vistoriaByOs?.get(o.id);
      return toOrdemAlerta(o, calcPrazoOs(o, v));
    })
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
export function ordensComPrazoVencidoLocal(ordens: OrdemServico[]): OrdemPrazoAlerta[] {
  return ordensComPrazoAlerta(ordens);
}

export function listAlertasPrazoLocal(
  demandas: Demanda[],
  ordens: OrdemServico[],
  vistoriaByOs?: Map<string, Vistoria>,
): AlertasPrazoResult {
  return {
    demandas: demandasComPrazoAlerta(demandas),
    ordens: ordensComPrazoAlerta(ordens, vistoriaByOs),
    generatedAt: new Date().toISOString(),
  };
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
