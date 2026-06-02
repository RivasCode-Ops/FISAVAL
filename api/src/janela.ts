const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isHhmm(s: string): boolean {
  return HHMM.test(s.trim());
}

export function hhmmToSeconds(hhmm: string): number {
  const [h, m] = hhmm.trim().split(':').map(Number);
  return h * 3600 + m * 60;
}

export function nowSecondsLocal(): number {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/** Janela vazia ou horário atual dentro de visitaInicio–visitaFim (HH:mm). */
export function dentroJanelaVisita(visitaInicio?: string, visitaFim?: string, nowSec = nowSecondsLocal()): boolean {
  if (!visitaInicio || !visitaFim || !isHhmm(visitaInicio) || !isHhmm(visitaFim)) return true;
  const a = hhmmToSeconds(visitaInicio);
  const b = hhmmToSeconds(visitaFim);
  if (a <= b) return nowSec >= a && nowSec <= b;
  return nowSec >= a || nowSec <= b;
}

export function vroomTimeWindow(visitaInicio?: string, visitaFim?: string): [number, number][] | undefined {
  if (!visitaInicio || !visitaFim || !isHhmm(visitaInicio) || !isHhmm(visitaFim)) return undefined;
  return [[hhmmToSeconds(visitaInicio), hhmmToSeconds(visitaFim)]];
}
