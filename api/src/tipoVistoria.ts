/** Skills VROOM (1–5) por tipo de demanda/OS. */
const TIPO_SKILL: Record<string, number> = {
  'revisão cadastral': 1,
  'revisao cadastral': 1,
  'denúncia': 2,
  'denuncia': 2,
  recadastramento: 3,
  'auditoria interna': 4,
  auditoria: 4,
};

export const VROOM_SKILLS_FISCAL = [1, 2, 3, 4, 5];

export const TIPOS_VISTORIA_PADRAO = [
  'Revisão cadastral',
  'Denúncia',
  'Recadastramento',
  'Auditoria interna',
] as const;

export function skillForTipo(tipo?: string): number {
  if (!tipo?.trim()) return 5;
  return TIPO_SKILL[tipo.trim().toLowerCase()] ?? 5;
}
