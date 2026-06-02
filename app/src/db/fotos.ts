import { db } from '@/db/database';
import type { FotoLocal, VistoriaFoto } from '@/types';

export function fotoMeta(f: FotoLocal): VistoriaFoto {
  const { blob: _b, syncStatus: _s, ...meta } = f;
  return meta;
}

export async function listFotosDexie(vistoriaId: string): Promise<VistoriaFoto[]> {
  const rows = await db.fotos.where('vistoriaId').equals(vistoriaId).toArray();
  return rows.map(fotoMeta);
}

export async function getFotoLocal(id: string): Promise<FotoLocal | undefined> {
  return db.fotos.get(id);
}

export async function saveFotoLocal(vistoriaId: string, file: File): Promise<FotoLocal> {
  const id = `F-${Date.now().toString(36)}`;
  const row: FotoLocal = {
    id,
    vistoriaId,
    filename: file.name || `foto-${id}.jpg`,
    mime: file.type || 'image/jpeg',
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
    syncStatus: 'local',
    blob: file,
  };
  await db.fotos.put(row);
  return row;
}

export async function markFotoSynced(local: FotoLocal, remote: VistoriaFoto): Promise<void> {
  await db.fotos.delete(local.id);
  await db.fotos.put({
    ...remote,
    syncStatus: 'synced',
    blob: local.blob,
  });
}

export async function listFotosPendentes(): Promise<FotoLocal[]> {
  return db.fotos.where('syncStatus').equals('local').toArray();
}
