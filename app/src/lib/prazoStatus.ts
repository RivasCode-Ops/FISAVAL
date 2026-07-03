import type { Demanda, OrdemServico, StatusPrazo, Vistoria } from '@/types';

export const PRAZO_AVISER_DIAS = 1;

export type PrazoCalculado = {
  statusPrazo: StatusPrazo;
  diasEmAtraso: number;
  diasRestantes: number;
  labelCurto: string;
};

export function resolvePrazoVistoria(d: Pick<Demanda, 'prazoVistoriaEm' | 'prazo'>): string | undefined {
  return d.prazoVistoriaEm ?? d.prazo;
}

export function resolvePrazoCampo(o: Pick<OrdemServico, 'prazoCampoEm' | 'prazo'>): string | undefined {
  return o.prazoCampoEm ?? o.prazo;
}

export function daysUntilPrazo(prazo: string, at = Date.now()): number {
  const p = prazo.slice(0, 10);
  return Math.floor((new Date(`${p}T12:00:00`).getTime() - at) / 86_400_000);
}

function endOfPrazoDay(prazo: string): number {
  return new Date(`${prazo.slice(0, 10)}T23:59:59.999`).getTime();
}

export function labelStatusPrazo(
  status: StatusPrazo,
  diasRestantes: number,
  diasEmAtraso: number,
  nivel: 'demanda' | 'campo',
): string {
  const aplicadaOk = nivel === 'demanda' ? 'Aplicada no prazo' : 'Executada no prazo';
  const aplicadaAtraso = nivel === 'demanda' ? 'Aplicada em atraso' : 'Executada em atraso';
  switch (status) {
    case 'NO_PRAZO':
      return 'No prazo';
    case 'A_VENCER':
      if (diasRestantes === 0) return 'Vence hoje';
      if (diasRestantes === 1) return 'Vence em 1 dia';
      return `Vence em ${diasRestantes} dias`;
    case 'VENCIDA':
      return diasEmAtraso === 1 ? 'Vencida há 1 dia' : `Vencida há ${diasEmAtraso} dias`;
    case 'APLICADA_NO_PRAZO':
      return aplicadaOk;
    case 'APLICADA_EM_ATRASO':
      return aplicadaAtraso;
    default:
      return '—';
  }
}

function calcAberto(prazo: string, at: number): PrazoCalculado {
  const diasRestantes = daysUntilPrazo(prazo, at);
  if (diasRestantes < 0) {
    const diasEmAtraso = -diasRestantes;
    return {
      statusPrazo: 'VENCIDA',
      diasEmAtraso,
      diasRestantes,
      labelCurto: labelStatusPrazo('VENCIDA', diasRestantes, diasEmAtraso, 'demanda'),
    };
  }
  if (diasRestantes <= PRAZO_AVISER_DIAS) {
    return {
      statusPrazo: 'A_VENCER',
      diasEmAtraso: 0,
      diasRestantes,
      labelCurto: labelStatusPrazo('A_VENCER', diasRestantes, 0, 'demanda'),
    };
  }
  return {
    statusPrazo: 'NO_PRAZO',
    diasEmAtraso: 0,
    diasRestantes,
    labelCurto: labelStatusPrazo('NO_PRAZO', diasRestantes, 0, 'demanda'),
  };
}

function calcAplicado(
  prazo: string,
  inicioEm: string,
  nivel: 'demanda' | 'campo',
): PrazoCalculado {
  const prazoEnd = endOfPrazoDay(prazo);
  const inicioTs = new Date(inicioEm).getTime();
  const noPrazo = inicioTs <= prazoEnd;
  const diasEmAtraso = noPrazo
    ? 0
    : Math.max(1, Math.ceil((inicioTs - prazoEnd) / 86_400_000));
  const statusPrazo: StatusPrazo = noPrazo ? 'APLICADA_NO_PRAZO' : 'APLICADA_EM_ATRASO';
  return {
    statusPrazo,
    diasEmAtraso,
    diasRestantes: daysUntilPrazo(prazo),
    labelCurto: labelStatusPrazo(statusPrazo, daysUntilPrazo(prazo), diasEmAtraso, nivel),
  };
}

export function calcPrazoDemanda(demanda: Demanda, at = Date.now()): PrazoCalculado {
  const prazo = resolvePrazoVistoria(demanda);
  if (!prazo) {
    return {
      statusPrazo: 'NO_PRAZO',
      diasEmAtraso: 0,
      diasRestantes: 999,
      labelCurto: 'Sem prazo',
    };
  }
  if (demanda.status !== 'aberta') {
    const inicio = demanda.dataInicioExecucaoEm ?? demanda.updatedAt;
    return calcAplicado(prazo, inicio, 'demanda');
  }
  const aberto = calcAberto(prazo, at);
  return { ...aberto, labelCurto: labelStatusPrazo(aberto.statusPrazo, aberto.diasRestantes, aberto.diasEmAtraso, 'demanda') };
}

export function calcPrazoOs(ordem: OrdemServico, vistoria?: Vistoria | null, at = Date.now()): PrazoCalculado {
  const prazo = resolvePrazoCampo(ordem);
  if (!prazo) {
    return {
      statusPrazo: 'NO_PRAZO',
      diasEmAtraso: 0,
      diasRestantes: 999,
      labelCurto: 'Sem prazo',
    };
  }
  if (vistoria?.checkInAt) {
    return calcAplicado(prazo, vistoria.checkInAt, 'campo');
  }
  const aberto = calcAberto(prazo, at);
  return { ...aberto, labelCurto: labelStatusPrazo(aberto.statusPrazo, aberto.diasRestantes, aberto.diasEmAtraso, 'campo') };
}

export function badgeClassStatusPrazo(status: StatusPrazo): string {
  if (status === 'VENCIDA' || status === 'APLICADA_EM_ATRASO') return 'b-pri-alta';
  if (status === 'A_VENCER') return 'b-pri-media';
  if (status === 'APLICADA_NO_PRAZO') return 'b-status';
  return 'b-status';
}

export function normalizeDemandaPrazo<T extends Demanda>(d: T): T {
  const prazoVistoriaEm = d.prazoVistoriaEm ?? d.prazo;
  return { ...d, prazo: d.prazo ?? prazoVistoriaEm, prazoVistoriaEm };
}

export function normalizeOrdemPrazo<T extends OrdemServico>(o: T): T {
  const prazoCampoEm = o.prazoCampoEm ?? o.prazo;
  return { ...o, prazo: o.prazo ?? prazoCampoEm, prazoCampoEm };
}
