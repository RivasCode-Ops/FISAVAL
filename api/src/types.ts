export type FinalidadeVistoria = 'IPTU' | 'ITBI' | 'OBRA' | 'DENUNCIA' | 'RECADASTRAMENTO';
export type ResultadoConferencia = 'de_acordo' | 'divergente' | 'parcial';

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
  /** Vazio = todos os tipos (skills VROOM 1–5). */
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
  prazo: string;
  prazoVistoriaEm?: string;
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
  prazo?: string;
  prazoCampoEm?: string;
  /** Janela de visita (HH:mm local). */
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
  checkInAccuracyM?: number;
  concluidaAt?: string;
  assinaturaAt?: string;
  assinaturaNome?: string;
  assinaturaModo?: AssinaturaModo;
  /** Referência externa (ICP-Brasil / gov.br). */
  assinaturaRef?: string;
  syncStatus: 'local' | 'synced';
  createdAt: string;
  updatedAt: string;
}

export interface VistoriaFoto {
  id: string;
  vistoriaId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
  legenda?: string;
}

export interface DbShape {
  users: User[];
  demandas: Demanda[];
  ordens: OrdemServico[];
  vistorias: Vistoria[];
  fotos: VistoriaFoto[];
}
