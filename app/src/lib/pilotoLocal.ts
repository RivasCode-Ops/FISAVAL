/** Modo piloto local: fluxo demanda→OS→campo→laudo sem fases 13–18 na UI. */
export const PILOTO_LOCAL = import.meta.env.VITE_PILOTO_LOCAL !== 'false';

/** Mínimo de fotos para concluir vistoria (0 = opcional no piloto). */
export const MIN_FOTOS_IMOVEL = 0;

export const MAX_FOTOS_PILOTO = 10;

/** Roteiro sugerido (1 foto por item, na ordem). */
export const FOTOS_IMOVEL_ROTEIRO = [
  'Fachada principal',
  'Lateral esquerda',
  'Lateral direita',
  'Fundos ou área interna',
] as const;
