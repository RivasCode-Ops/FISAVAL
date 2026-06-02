import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { uid } from './jsonRepo.js';

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  userEmail: string;
  userNome: string;
  role: string;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
}

const MAX_ENTRIES = 2000;
const auditPath = () => join(config.dataDir, 'audit-log.json');

function load(): AuditEntry[] {
  const p = auditPath();
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as AuditEntry[];
  } catch {
    return [];
  }
}

function save(entries: AuditEntry[]) {
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(auditPath(), JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2), 'utf8');
}

export function logAudit(
  user: { id: string; email: string; nome: string; role: string },
  action: string,
  opts?: { entity?: string; entityId?: string; detail?: string },
) {
  const entry: AuditEntry = {
    id: uid('A'),
    at: new Date().toISOString(),
    userId: user.id,
    userEmail: user.email,
    userNome: user.nome,
    role: user.role,
    action,
    entity: opts?.entity,
    entityId: opts?.entityId,
    detail: opts?.detail,
  };
  const rows = load();
  rows.unshift(entry);
  save(rows);
}

export function listAudit(limit = 200): AuditEntry[] {
  return load().slice(0, limit);
}
