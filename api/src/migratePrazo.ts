import type { Demanda, OrdemServico, Vistoria } from './types.js';
import { normalizeDemandaPrazo, normalizeOrdemPrazo } from './prazoStatus.js';

const DEMO_DEMANDA_PRAZO: Record<string, string> = { 'D-1043': '2025-12-01' };
const DEMO_ORDEM_PRAZO: Record<string, string> = { 'OS-8821': '2025-10-20' };
const STALE_PRAZO_FROM = '2026-01-01';

function isStaleDemoPrazo(prazo: string | undefined): boolean {
  if (!prazo) return true;
  return prazo.slice(0, 10) >= STALE_PRAZO_FROM;
}

function applyDemoDemandaFix(d: Demanda): Demanda {
  const canonical = DEMO_DEMANDA_PRAZO[d.id];
  if (!canonical || d.status !== 'aberta') return d;
  const current = d.prazoVistoriaEm ?? d.prazo;
  if (!isStaleDemoPrazo(current)) return d;
  return { ...d, prazo: canonical, prazoVistoriaEm: canonical };
}

function applyDemoOrdemFix(o: OrdemServico, vistorias: Vistoria[]): OrdemServico {
  const canonical = DEMO_ORDEM_PRAZO[o.id];
  if (!canonical) return o;
  const v = vistorias.find((x) => x.osId === o.id);
  if (v?.checkInAt) return o;
  const current = o.prazoCampoEm ?? o.prazo;
  if (!isStaleDemoPrazo(current)) return o;
  return { ...o, prazo: canonical, prazoCampoEm: canonical };
}

function demandaChanged(before: Demanda, after: Demanda): boolean {
  return (
    before.prazo !== after.prazo ||
    before.prazoVistoriaEm !== after.prazoVistoriaEm ||
    before.dataInicioExecucaoEm !== after.dataInicioExecucaoEm
  );
}

function ordemChanged(before: OrdemServico, after: OrdemServico): boolean {
  return before.prazo !== after.prazo || before.prazoCampoEm !== after.prazoCampoEm;
}

export function migratePrazoRecords(
  demandas: Demanda[],
  ordens: OrdemServico[],
  vistorias: Vistoria[] = [],
): { demandas: Demanda[]; ordens: OrdemServico[]; changed: boolean } {
  const ordemByDemanda = new Map<string, OrdemServico>();
  for (const o of ordens) {
    if (!ordemByDemanda.has(o.demandaId)) ordemByDemanda.set(o.demandaId, o);
  }

  let changed = false;
  const newDemandas = demandas.map((raw) => {
    let d = applyDemoDemandaFix(normalizeDemandaPrazo(raw));
    if (d.status === 'os_gerada' && !d.dataInicioExecucaoEm) {
      const os = ordemByDemanda.get(d.id);
      d = { ...d, dataInicioExecucaoEm: os?.createdAt ?? d.updatedAt };
    }
    if (demandaChanged(raw, d)) changed = true;
    return d;
  });

  const newOrdens = ordens.map((raw) => {
    const o = applyDemoOrdemFix(normalizeOrdemPrazo(raw), vistorias);
    if (ordemChanged(raw, o)) changed = true;
    return o;
  });

  return { demandas: newDemandas, ordens: newOrdens, changed };
}
