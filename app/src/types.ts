export type { FinalidadeVistoria, ResultadoConferencia } from '@/lib/finalidadeVistoria';
import type { FinalidadeVistoria, ResultadoConferencia } from '@/lib/finalidadeVistoria';

export type UserRole = 'fiscal' | 'gestor' | 'admin';

export type Prioridade = 'alta' | 'media' | 'baixa';

export type DemandaStatus = 'aberta' | 'os_gerada' | 'concluida';

export type StatusPrazo =
  | 'NO_PRAZO'
  | 'A_VENCER'
  | 'VENCIDA'
  | 'APLICADA_NO_PRAZO'
  | 'APLICADA_EM_ATRASO';

export type AssinaturaModo = 'canvas' | 'icp' | 'govbr';

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
  finalidade?: FinalidadeVistoria;
  dadosReferencia?: Record<string, string>;
  bairro: string;
  prioridade: Prioridade;
  /** @deprecated Use prazoVistoriaEm — mantido para compatibilidade. */
  prazo: string;
  /** Prazo-limite para gerar OS / iniciar vistoria (YYYY-MM-DD). */
  prazoVistoriaEm?: string;
  /** Quando a demanda virou OS (gerarOs). */
  dataInicioExecucaoEm?: string;
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
  finalidade?: FinalidadeVistoria;
  dadosReferencia?: Record<string, string>;
  prioridade?: Prioridade;
  /** @deprecated Use prazoCampoEm — mantido para compatibilidade. */
  prazo?: string;
  /** Prazo-limite para check-in em campo (YYYY-MM-DD). */
  prazoCampoEm?: string;
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
  resultadoConferencia?: ResultadoConferencia;
  observacaoConferencia?: string;
  justificativa?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkInAt?: string;
  /** Precisão informada pelo dispositivo no check-in (metros). */
  checkInAccuracyM?: number;
  concluidaAt?: string;
  assinaturaAt?: string;
  assinaturaNome?: string;
  assinaturaModo?: AssinaturaModo;
  assinaturaRef?: string;
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
  /** Legenda técnica (ex.: roteiro fachada, evidência). */
  legenda?: string;
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
