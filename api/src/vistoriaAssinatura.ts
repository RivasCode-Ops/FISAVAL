import type { Vistoria } from './types.js';

export function vistoriaTemAssinatura(v: Vistoria | null | undefined, temArquivoCanvas: boolean): boolean {
  if (!v?.assinaturaAt) return false;
  if (v.assinaturaModo === 'icp' || v.assinaturaModo === 'govbr') {
    return !!v.assinaturaRef?.trim();
  }
  return temArquivoCanvas;
}
