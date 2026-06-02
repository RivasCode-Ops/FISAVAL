import Dexie, { type Table } from 'dexie';
import type { AssinaturaLocal, Demanda, FotoLocal, OrdemServico, User, Vistoria } from '@/types';

export class FisavalDB extends Dexie {
  users!: Table<User, string>;
  demandas!: Table<Demanda, string>;
  ordens!: Table<OrdemServico, string>;
  vistorias!: Table<Vistoria, string>;
  fotos!: Table<FotoLocal, string>;
  assinaturas!: Table<AssinaturaLocal, string>;

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
    this.version(3).stores({
      users: 'id, email, role',
      demandas: 'id, status, prioridade, bairro, updatedAt',
      ordens: 'id, demandaId, fiscalId, status, updatedAt',
      vistorias: 'id, osId, syncStatus, updatedAt',
      fotos: 'id, vistoriaId, syncStatus, createdAt',
      assinaturas: 'vistoriaId, syncStatus',
    });
  }
}

export const db = new FisavalDB();
