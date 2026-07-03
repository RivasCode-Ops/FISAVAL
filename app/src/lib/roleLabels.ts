import type { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  fiscal: 'Agente de campo',
  gestor: 'Coordenador',
  admin: 'Administrador',
};

export function labelRole(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function canAccessPainel(role: UserRole): boolean {
  return role === 'gestor' || role === 'admin';
}

export function canAccessDemandas(role: UserRole): boolean {
  return role === 'gestor' || role === 'admin';
}

export function canAccessCampo(role: UserRole): boolean {
  return role === 'fiscal';
}

export function canAccessAuditoria(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccessAdministration(role: UserRole): boolean {
  return role === 'admin';
}

export function homePathForRole(role: UserRole): string {
  if (role === 'fiscal') return '/campo';
  return '/painel';
}
