import { dentroJanelaVisita } from './janela.js';
import { skillForTipo } from './tipoVistoria.js';
import type { OrdemServico, OsStatus, Prioridade } from './types.js';

export type GeoPoint = { lat: number; lng: number };

const ATIVAS: OsStatus[] = [
  'atribuida',
  'em_campo',
  'check_in',
  'em_vistoria',
  'pendente_sync',
  'interrompida',
];

export function filtrarOsAtivas(ordens: OrdemServico[]): OrdemServico[] {
  return ordens.filter((o) => ATIVAS.includes(o.status));
}

export function distKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const PRI_RANK: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

export function daysUntilPrazo(prazo: string): number {
  const p = prazo.slice(0, 10);
  const t = new Date(`${p}T12:00:00`).getTime();
  return Math.floor((t - Date.now()) / 86_400_000);
}

export function urgenciaScore(o: {
  prioridade?: Prioridade;
  prazo?: string;
  tipo?: string;
  visitaInicio?: string;
  visitaFim?: string;
}): number {
  const pri = o.prioridade ? PRI_RANK[o.prioridade] : 1;
  const days = o.prazo ? daysUntilPrazo(o.prazo) : 30;
  let score = pri * 1000 + Math.max(0, days);
  if (o.visitaInicio && o.visitaFim && !dentroJanelaVisita(o.visitaInicio, o.visitaFim)) {
    score += 5000;
  }
  return score;
}

/** Vizinho mais próximo com desempate por prioridade/prazo. */
export function ordenarPorPrazoEProximidade(ordens: OrdemServico[], start: GeoPoint): OrdemServico[] {
  const rest = [...ordens];
  const out: OrdemServico[] = [];
  let cur = start;
  while (rest.length) {
    const dists = rest.map((o) => distKm(cur, { lat: o.lat, lng: o.lng }));
    const minD = Math.min(...dists);
    const near = rest.filter((_, i) => dists[i] <= minD * 1.5 + 0.05);
    const pool = near.length ? near : rest;
    pool.sort((a, b) => {
      const sa = skillForTipo(a.tipo);
      const sb = skillForTipo(b.tipo);
      if (sa !== sb) return sa - sb;
      return urgenciaScore(a) - urgenciaScore(b);
    });
    const next = pool[0];
    const idx = rest.indexOf(next);
    rest.splice(idx, 1);
    out.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  return out;
}

export function ordenarPorProximidade(ordens: OrdemServico[], start: GeoPoint): OrdemServico[] {
  const rest = [...ordens];
  const out: OrdemServico[] = [];
  let cur = start;
  while (rest.length) {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const d = distKm(cur, { lat: rest[i].lat, lng: rest[i].lng });
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    const next = rest.splice(idx, 1)[0];
    out.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  return out;
}

/** Distância total (km) e tempo estimado (min) a ~35 km/h urbano. */
export function estimateRotaStats(ordens: OrdemServico[], start: GeoPoint): { distanciaKm: number; duracaoMinEst: number } {
  if (ordens.length === 0) return { distanciaKm: 0, duracaoMinEst: 0 };
  let km = distKm(start, { lat: ordens[0].lat, lng: ordens[0].lng });
  for (let i = 1; i < ordens.length; i++) {
    km += distKm(
      { lat: ordens[i - 1].lat, lng: ordens[i - 1].lng },
      { lat: ordens[i].lat, lng: ordens[i].lng },
    );
  }
  const duracaoMinEst = Math.round((km / 35) * 60);
  return { distanciaKm: Math.round(km * 10) / 10, duracaoMinEst };
}
