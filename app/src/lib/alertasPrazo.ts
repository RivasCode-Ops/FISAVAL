import { filtrarOsAtivas, prazoVencido } from '@/lib/rota';
import type { OrdemServico } from '@/types';

export type OrdemPrazoAlerta = {
  id: string;
  fiscalNome: string;
  endereco: string;
  bairro: string;
  tipo?: string;
  prazo: string;
  diasAtraso: number;
  status: string;
};

function diasAtraso(prazo: string): number {
  const p = prazo.slice(0, 10);
  const days = Math.floor((Date.now() - new Date(`${p}T12:00:00`).getTime()) / 86_400_000);
  return Math.max(0, days);
}

export function ordensComPrazoVencidoLocal(ordens: OrdemServico[]): OrdemPrazoAlerta[] {
  return filtrarOsAtivas(ordens)
    .filter((o) => o.prazo && prazoVencido(o.prazo))
    .map((o) => ({
      id: o.id,
      fiscalNome: o.fiscalNome,
      endereco: o.endereco,
      bairro: o.bairro,
      tipo: o.tipo,
      prazo: o.prazo!.slice(0, 10),
      diasAtraso: diasAtraso(o.prazo!),
      status: o.status,
    }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso);
}
