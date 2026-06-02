import type { Vistoria } from '@/types';

export function vistoriaTemAssinatura(v: Vistoria | null | undefined, temArquivoCanvas: boolean): boolean {
  if (!v?.assinaturaAt) return false;
  if (v.assinaturaModo === 'icp' || v.assinaturaModo === 'govbr') {
    return !!v.assinaturaRef?.trim();
  }
  return temArquivoCanvas || !!v.assinaturaAt;
}

export function labelAssinaturaModo(v: Vistoria): string {
  if (v.assinaturaModo === 'icp') return `ICP-Brasil · ${v.assinaturaRef ?? '—'}`;
  if (v.assinaturaModo === 'govbr') return `gov.br · ${v.assinaturaRef ?? '—'}`;
  return v.assinaturaNome ?? 'Canvas';
}
