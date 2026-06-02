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

export function sanitizeTiposHabilitados(tipos: unknown): string[] {
  if (!Array.isArray(tipos)) return [];
  return tipos
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim());
}

/** Sem lista = habilitado para qualquer tipo. */
export function fiscalHandlesTipo(tiposHabilitados: string[] | undefined | null, tipo?: string): boolean {
  if (!tiposHabilitados?.length) return true;
  const t = (tipo ?? '').trim().toLowerCase();
  if (!t) return true;
  return tiposHabilitados.some((h) => h.trim().toLowerCase() === t);
}

export function skillsForFiscal(tiposHabilitados?: string[] | null): number[] {
  if (!tiposHabilitados?.length) return [...VROOM_SKILLS_FISCAL];
  const skills = [...new Set(tiposHabilitados.map((t) => skillForTipo(t)))].sort((a, b) => a - b);
  return skills.length ? skills : [...VROOM_SKILLS_FISCAL];
}
