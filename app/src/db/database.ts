import Dexie, { type Table } from 'dexie';
import type { Demanda, FotoLocal, OrdemServico, User, Vistoria } from '@/types';

export class FisavalDB extends Dexie {
  users!: Table<User, string>;
  demandas!: Table<Demanda, string>;
  ordens!: Table<OrdemServico, string>;
  vistorias!: Table<Vistoria, string>;
  fotos!: Table<FotoLocal, string>;

  constructor() {
    super('fisaval');
    this.version(1).stores({
      users: 'id, email, role',
      demandas: 'id, status, prioridade, bairro, updatedAt',
      ordens: 'id, demandaId, fiscalId, status, updatedAt',
      vistorias: 'id, osId, syncStatus, updatedAt',
    });
    this.version(2).stores({
      users: 'id, email, role',
      demandas: 'id, status, prioridade, bairro, updatedAt',
      ordens: 'id, demandaId, fiscalId, status, updatedAt',
      vistorias: 'id, osId, syncStatus, updatedAt',
      fotos: 'id, vistoriaId, syncStatus, createdAt',
    });
  }
}

export const db = new FisavalDB();
