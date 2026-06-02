const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isHhmm(s: string): boolean {
  return HHMM.test(s.trim());
}

function hhmmToSeconds(hhmm: string): number {
  const [h, m] = hhmm.trim().split(':').map(Number);
  return h * 3600 + m * 60;
}

function nowSecondsLocal(): number {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60;
}

export function dentroJanelaVisita(visitaInicio?: string, visitaFim?: string): boolean {
  if (!visitaInicio || !visitaFim || !isHhmm(visitaInicio) || !isHhmm(visitaFim)) return true;
  const now = nowSecondsLocal();
  const a = hhmmToSeconds(visitaInicio);
  const b = hhmmToSeconds(visitaFim);
  if (a <= b) return now >= a && now <= b;
  return now >= a || now <= b;
}

export function formatJanela(visitaInicio?: string, visitaFim?: string): string {
  if (!visitaInicio || !visitaFim) return '';
  return `${visitaInicio}–${visitaFim}`;
}
