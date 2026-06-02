import { getActiveTenantId } from './tenantContext.js';

export type AssinaturaModo = 'canvas' | 'icp' | 'govbr';

const ALL: AssinaturaModo[] = ['canvas', 'icp', 'govbr'];

export function listAssinaturaModos(): AssinaturaModo[] {
  const raw = process.env.ASSINATURA_MODOS?.trim();
  if (!raw) return ['canvas'];
  const picked = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AssinaturaModo => ALL.includes(s as AssinaturaModo));
  return picked.length ? [...new Set(picked)] : ['canvas'];
}

export function assinaturaPadrao(): AssinaturaModo {
  const modos = listAssinaturaModos();
  const pref = (process.env.ASSINATURA_PADRAO || 'canvas').trim().toLowerCase() as AssinaturaModo;
  return modos.includes(pref) ? pref : modos[0];
}

export function isCertificadaModo(modo: string): modo is 'icp' | 'govbr' {
  return modo === 'icp' || modo === 'govbr';
}

export function demoCertificadaRef(modo: 'icp' | 'govbr'): string {
  const tid = getActiveTenantId();
  return `DEMO-${modo.toUpperCase()}-${tid}-${Date.now().toString(36)}`;
}
