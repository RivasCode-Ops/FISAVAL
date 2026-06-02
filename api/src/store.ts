import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '..', 'data');
const dbPath = join(dataDir, 'fisaval.json');

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
}

export interface Demanda {
  id: string;
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
  syncStatus: 'local' | 'synced';
  createdAt: string;
  updatedAt: string;
}

export interface DbShape {
  users: User[];
  demandas: Demanda[];
  ordens: OrdemServico[];
  vistorias: Vistoria[];
}

const now = () => new Date().toISOString();

function empty(): DbShape {
  return { users: [], demandas: [], ordens: [], vistorias: [] };
}

export function loadDb(): DbShape {
  if (!existsSync(dbPath)) return empty();
  return JSON.parse(readFileSync(dbPath, 'utf8')) as DbShape;
}

export function saveDb(db: DbShape) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export function ensureSeed() {
  const db = loadDb();
  if (db.users.length > 0) return db;

  const t = now();
  db.users = [
    { id: 'u-gestor', email: 'gestor@demo', nome: 'Gestor Finanças', role: 'gestor', senha: 'demo123' },
    { id: 'u-fiscal1', email: 'fiscal@demo', nome: 'Ana Silva', role: 'fiscal', senha: 'demo123' },
    { id: 'u-fiscal2', email: 'carlos@demo', nome: 'Carlos Mendes', role: 'fiscal', senha: 'demo123' },
    { id: 'u-admin', email: 'admin@demo', nome: 'Administrador', role: 'admin', senha: 'demo123' },
  ];
  db.demandas = [
    {
      id: 'D-1042',
      tipo: 'Revisão cadastral',
      bairro: 'Centro',
      prioridade: 'alta',
      prazo: '2026-06-05',
      status: 'os_gerada',
      inscricao: '12.034.0056.0001',
      endereco: 'R. das Flores, 123',
      lat: -23.5505,
      lng: -46.6333,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'D-1043',
      tipo: 'Denúncia',
      bairro: 'Vila Nova',
      prioridade: 'alta',
      prazo: '2026-06-04',
      status: 'aberta',
      inscricao: '12.034.0089.0012',
      endereco: 'Av. Brasil, 890',
      lat: -23.552,
      lng: -46.631,
      createdAt: t,
      updatedAt: t,
    },
  ];
  db.ordens = [
    {
      id: 'OS-8821',
      demandaId: 'D-1042',
      fiscalId: 'u-fiscal1',
      fiscalNome: 'Ana Silva',
      inscricao: '12.034.0056.0001',
      endereco: 'R. das Flores, 123',
      bairro: 'Centro',
      status: 'atribuida',
      lat: -23.5505,
      lng: -46.6333,
      rotaOrdem: 1,
      createdAt: t,
      updatedAt: t,
    },
  ];
  db.vistorias = [];
  saveDb(db);
  return db;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

export function mutate(fn: (db: DbShape) => void): DbShape {
  const db = loadDb();
  fn(db);
  saveDb(db);
  return db;
}
