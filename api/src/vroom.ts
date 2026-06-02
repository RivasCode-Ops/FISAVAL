import { vroomTimeWindow } from './janela.js';
import { skillForTipo, VROOM_SKILLS_FISCAL } from './tipoVistoria.js';
import type { GeoPoint } from './rota.js';
import type { OrdemServico } from './types.js';

/** Índices de `ordens` na ordem sugerida pelo VROOM, ou null se indisponível. */
export async function ordenarComVroom(
  baseUrl: string,
  start: GeoPoint,
  ordens: OrdemServico[],
  vehicleCapacity?: number,
  vehicleSkills: number[] = VROOM_SKILLS_FISCAL,
): Promise<number[] | null> {
  if (ordens.length < 2) return null;
  const url = baseUrl.replace(/\/$/, '');
  const vehicle: {
    id: number;
    start: [number, number];
    skills: number[];
    capacity?: number[];
  } = {
    id: 1,
    start: [start.lng, start.lat],
    skills: vehicleSkills.length ? vehicleSkills : VROOM_SKILLS_FISCAL,
  };
  if (vehicleCapacity != null && vehicleCapacity > 0) {
    vehicle.capacity = [vehicleCapacity];
  }
  const body = {
    vehicles: [vehicle],
    jobs: ordens.map((o, i) => {
      const job: {
        id: number;
        location: [number, number];
        skills: number[];
        time_windows?: [number, number][];
      } = {
        id: i + 1,
        location: [o.lng, o.lat],
        skills: [skillForTipo(o.tipo)],
      };
      const tw = vroomTimeWindow(o.visitaInicio, o.visitaFim);
      if (tw) job.time_windows = tw;
      return job;
    }),
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { steps?: { type: string; job?: number }[] }[];
    };
    const steps = data.routes?.[0]?.steps;
    if (!steps?.length) return null;
    const order: number[] = [];
    for (const s of steps) {
      if (s.type === 'job' && s.job != null) {
        const idx = s.job - 1;
        if (idx >= 0 && idx < ordens.length) order.push(idx);
      }
    }
    if (order.length !== ordens.length) return null;
    return order;
  } catch {
    return null;
  }
}
