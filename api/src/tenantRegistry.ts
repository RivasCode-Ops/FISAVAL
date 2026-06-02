import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';

export type TenantInfo = { id: string; municipio: string };

let cache: TenantInfo[] | null = null;

export function listTenants(): TenantInfo[] {
  if (cache) return cache;
  const out: TenantInfo[] = [];
  const env = process.env.TENANTS?.trim();
  if (env) {
    for (const part of env.split(';')) {
      const [id, nome] = part.split(':').map((s) => s.trim());
      if (id) out.push({ id, municipio: nome || id });
    }
  }
  const regPath = join(config.dataDir, 'tenants-registry.json');
  if (existsSync(regPath)) {
    try {
      const j = JSON.parse(readFileSync(regPath, 'utf8')) as {
        tenants?: Record<string, { municipio?: string }>;
      };
      for (const [id, meta] of Object.entries(j.tenants ?? {})) {
        if (!out.some((t) => t.id === id)) {
          out.push({ id, municipio: meta.municipio ?? id });
        }
      }
    } catch {
      /* ignora registry inválido */
    }
  }
  if (!out.some((t) => t.id === config.tenantId)) {
    out.unshift({ id: config.tenantId, municipio: config.municipioNome });
  }
  cache = out;
  return out;
}

export function isAllowedTenant(id: string): boolean {
  const norm = id.toLowerCase();
  if (!config.multiTenant) return norm === config.tenantId;
  if (listTenants().some((t) => t.id === norm)) return true;
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(norm);
}

export function municipioForTenant(id: string): string {
  return listTenants().find((t) => t.id === id)?.municipio ?? config.municipioNome;
}
