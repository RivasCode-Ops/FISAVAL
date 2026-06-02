export type UserRole = 'fiscal' | 'gestor' | 'admin';

export type Prioridade = 'alta' | 'media' | 'baixa';

export type DemandaStatus = 'aberta' | 'os_gerada' | 'concluida';

export type OsStatus =
  | 'atribuida'
  | 'em_campo'
  | 'check_in'
  | 'em_vistoria'
  | 'concluida'
  | 'interrompida'
  | 'pendente_sync'
  | 'homologacao'
  | 'homologada';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  senha: string;
  /** Vazio = todos os tipos. */
  tiposHabilitados?: string[];
}

export interface Demanda {
  id: string;
  tenantId?: string;
  tipo: string;
  bairro: string;
  prioridade: Prioridade;
  prazo: string;
  status: DemandaStatus;
  inscricao?: string;
  endereco?: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdemServico {
  id: string;
  demandaId: string;
  fiscalId: string;
  fiscalNome: string;
  inscricao: string;
  endereco: string;
  bairro: string;
  tipo?: string;
  prioridade?: Prioridade;
  prazo?: string;
  visitaInicio?: string;
  visitaFim?: string;
  status: OsStatus;
  lat: number;
  lng: number;
  rotaOrdem: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vistoria {
  id: string;
  osId: string;
  checklist: Record<string, boolean>;
  divergencia: boolean;
  justificativa?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkInAt?: string;
  concluidaAt?: string;
  assinaturaAt?: string;
  assinaturaNome?: string;
  syncStatus: 'local' | 'synced';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  email: string;
  nome: string;
  role: UserRole;
  superAdmin?: boolean;
}

export interface VistoriaFoto {
  id: string;
  vistoriaId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
}

/** Foto armazenada no IndexedDB (blob + metadados). */
export interface FotoLocal extends VistoriaFoto {
  syncStatus: 'local' | 'synced';
  blob: Blob;
}

export interface AssinaturaLocal {
  vistoriaId: string;
  fiscalNome: string;
  blob: Blob;
  syncStatus: 'local' | 'synced';
  createdAt: string;
}
