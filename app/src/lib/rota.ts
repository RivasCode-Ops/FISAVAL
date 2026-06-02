import type { OrdemServico } from '@/types';

export type GeoPoint = { lat: number; lng: number };

/** Distância aproximada em km (Haversine). */
export function distKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const ATIVAS: OrdemServico['status'][] = [
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

/** Vizinho mais próximo a partir de `start` (MVP roteirização). */
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

export function mapsDirUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
