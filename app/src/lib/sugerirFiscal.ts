import { filtrarOsAtivas } from '@/lib/rota';
import { fiscalHandlesTipo } from '@/lib/tipoVistoria';
import type { OrdemServico, User, Vistoria } from '@/types';

export type FiscalCarga = { ativas: number; visitasHoje: number };

export function buildFiscalCargaLocal(
  fiscais: { id: string }[],
  ordens: OrdemServico[],
  vistorias: Vistoria[],
): Record<string, FiscalCarga> {
  const hoje = new Date().toISOString().slice(0, 10);
  const out: Record<string, FiscalCarga> = {};
  for (const f of fiscais) out[f.id] = { ativas: 0, visitasHoje: 0 };
  for (const o of filtrarOsAtivas(ordens)) {
    if (out[o.fiscalId]) out[o.fiscalId].ativas += 1;
  }
  const osIds = new Set(ordens.map((o) => o.id));
  for (const v of vistorias) {
    if (!v.concluidaAt?.startsWith(hoje) || !osIds.has(v.osId)) continue;
    const o = ordens.find((x) => x.id === v.osId);
    if (o && out[o.fiscalId]) out[o.fiscalId].visitasHoje += 1;
  }
  return out;
}

export function pickFiscalIdLocal(
  fiscais: Omit<User, 'senha'>[],
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
