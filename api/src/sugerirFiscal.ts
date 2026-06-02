import { countVisitasHoje } from './fiscal.js';
import { filtrarOsAtivas } from './rota.js';
import { fiscalHandlesTipo } from './tipoVistoria.js';
import type { OrdemServico, Vistoria } from './types.js';

export type FiscalCarga = { ativas: number; visitasHoje: number };

export function buildFiscalCarga(
  fiscalIds: string[],
  ordens: OrdemServico[],
  vistorias: Vistoria[],
): Record<string, FiscalCarga> {
  const out: Record<string, FiscalCarga> = {};
  for (const id of fiscalIds) {
    out[id] = { ativas: 0, visitasHoje: 0 };
  }
  for (const o of filtrarOsAtivas(ordens)) {
    if (out[o.fiscalId]) out[o.fiscalId].ativas += 1;
  }
  for (const id of fiscalIds) {
    out[id].visitasHoje = countVisitasHoje(ordens, vistorias, id);
  }
  return out;
}

export function pickFiscalId(
  fiscais: { id: string; tiposHabilitados?: string[] }[],
  tipo: string,
  carga: Record<string, FiscalCarga>,
): string | null {
  const candidatos = fiscais.filter((f) => fiscalHandlesTipo(f.tiposHabilitados, tipo));
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => {
    const ca = carga[a.id] ?? { ativas: 0, visitasHoje: 0 };
    const cb = carga[b.id] ?? { ativas: 0, visitasHoje: 0 };
    if (ca.ativas !== cb.ativas) return ca.ativas - cb.ativas;
    if (ca.visitasHoje !== cb.visitasHoje) return ca.visitasHoje - cb.visitasHoje;
    return a.id.localeCompare(b.id);
  });
  return candidatos[0].id;
}
