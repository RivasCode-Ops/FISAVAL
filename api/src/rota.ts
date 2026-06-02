import type { OrdemServico, OsStatus } from './types.js';

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
