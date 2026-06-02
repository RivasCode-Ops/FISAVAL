const TIPO_SKILL: Record<string, number> = {
  'revisão cadastral': 1,
  'revisao cadastral': 1,
  'denúncia': 2,
  denuncia: 2,
  recadastramento: 3,
  'auditoria interna': 4,
  auditoria: 4,
};

export const TIPOS_VISTORIA = [
  'Revisão cadastral',
  'Denúncia',
  'Recadastramento',
  'Auditoria interna',
] as const;

export function skillForTipo(tipo?: string): number {
  if (!tipo?.trim()) return 5;
  return TIPO_SKILL[tipo.trim().toLowerCase()] ?? 5;
}
