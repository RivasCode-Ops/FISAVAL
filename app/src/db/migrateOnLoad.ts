import { db } from '@/db/database';
import { migratePrazoRecords } from '@/lib/migratePrazo';

export async function migrateLocalDbOnLoad(): Promise<boolean> {
  const [demandas, ordens, vistorias] = await Promise.all([
    db.demandas.toArray(),
    db.ordens.toArray(),
    db.vistorias.toArray(),
  ]);
  if (demandas.length === 0 && ordens.length === 0) return false;

  const { demandas: d2, ordens: o2, changed } = migratePrazoRecords(demandas, ordens, vistorias);
  if (!changed) return false;

  await db.transaction('rw', [db.demandas, db.ordens], async () => {
    await db.demandas.bulkPut(d2);
    await db.ordens.bulkPut(o2);
  });
  return true;
}

export async function resetLocalIndexedDb(): Promise<void> {
  await db.delete();
  await db.open();
}
