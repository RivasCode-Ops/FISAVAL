import { db } from '@/db/database';
import type { AssinaturaLocal } from '@/types';

export async function getAssinatura(vistoriaId: string): Promise<AssinaturaLocal | undefined> {
  return db.assinaturas.get(vistoriaId);
}

export async function saveAssinaturaLocal(vistoriaId: string, fiscalNome: string, blob: Blob) {
  const row: AssinaturaLocal = {
    vistoriaId,
    fiscalNome,
    blob,
    syncStatus: 'local',
    createdAt: new Date().toISOString(),
  };
  await db.assinaturas.put(row);
  return row;
}

export async function markAssinaturaSynced(vistoriaId: string) {
  const a = await db.assinaturas.get(vistoriaId);
  if (a) await db.assinaturas.put({ ...a, syncStatus: 'synced' });
}

export async function getAssinaturaObjectUrl(vistoriaId: string): Promise<string | null> {
  const a = await db.assinaturas.get(vistoriaId);
  if (!a?.blob) return null;
  return URL.createObjectURL(a.blob);
}

export async function listAssinaturasPendentes(): Promise<AssinaturaLocal[]> {
  return db.assinaturas.where('syncStatus').equals('local').toArray();
}
