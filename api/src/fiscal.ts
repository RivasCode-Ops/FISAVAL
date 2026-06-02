import type { OrdemServico, Vistoria } from './types.js';

export function countVisitasHoje(
  ordens: OrdemServico[],
  vistorias: Vistoria[],
  fiscalId?: string,
): number {
  const hoje = new Date().toISOString().slice(0, 10);
  const osIds = new Set(
    ordens.filter((o) => !fiscalId || o.fiscalId === fiscalId).map((o) => o.id),
  );
  return vistorias.filter((v) => osIds.has(v.osId) && v.concluidaAt?.startsWith(hoje)).length;
}
