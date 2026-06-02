import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { filterDemandas, filterOrdens, matchesTenant } from './tenant.js';
import type { ImportRow } from './importCsv.js';
import type { DbShape, Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria, VistoriaFoto } from './types.js';

const dbPath = join(config.dataDir, 'fisaval.json');

const now = () => new Date().toISOString();
export const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

function empty(): DbShape {
  return { users: [], demandas: [], ordens: [], vistorias: [], fotos: [] };
}

export function loadDb(): DbShape {
  if (!existsSync(dbPath)) return empty();
  const raw = JSON.parse(readFileSync(dbPath, 'utf8')) as DbShape;
  if (!raw.fotos) raw.fotos = [];
  return raw;
}

export function saveDb(db: DbShape) {
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export function seedJson(): DbShape {
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
  db.fotos = [];
  saveDb(db);
  return db;
}

export const jsonRepo = {
  mode: 'json' as const,
  async ensureSeed() {
    return seedJson();
  },
  async login(email: string, senha: string) {
    const db = loadDb();
    return db.users.find((u) => u.email === email && u.senha === senha) ?? null;
  },
  async bootstrap() {
    const db = loadDb();
    return {
      users: db.users.map(({ senha: _, ...u }) => u),
      demandas: db.demandas,
      ordens: db.ordens,
      vistorias: db.vistorias,
      fotos: db.fotos,
    };
  },
  async syncReplace(partial: { demandas?: Demanda[]; ordens?: OrdemServico[]; vistorias?: Vistoria[] }) {
    mutate((db) => {
      if (partial.demandas) db.demandas = partial.demandas;
      if (partial.ordens) db.ordens = partial.ordens;
      if (partial.vistorias) db.vistorias = partial.vistorias;
    });
  },
  async listDemandas() {
    return filterDemandas(loadDb().demandas);
  },
  async createDemanda(input: Omit<Demanda, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const t = now();
    const d: Demanda = {
      ...input,
      tenantId: input.tenantId ?? config.tenantId,
      id: uid('D'),
      status: 'aberta',
      createdAt: t,
      updatedAt: t,
    };
    mutate((db) => db.demandas.push(d));
    return d;
  },
  async bulkImportDemandas(rows: ImportRow[]) {
    const t = now();
    const created: Demanda[] = [];
    mutate((db) => {
      for (const r of rows) {
        const d: Demanda = {
          id: uid('D'),
          tenantId: config.tenantId,
          tipo: r.tipo,
          bairro: r.bairro,
          prioridade: r.prioridade,
          prazo: r.prazo,
          status: 'aberta',
          inscricao: r.inscricao,
          endereco: r.endereco,
          lat: r.lat ?? -23.55 + created.length * 0.001,
          lng: r.lng ?? -46.633 + created.length * 0.001,
          createdAt: t,
          updatedAt: t,
        };
        db.demandas.push(d);
        created.push(d);
      }
    });
    return created;
  },
  async gerarOs(demandaId: string, fiscalId: string, fiscalNome: string) {
    const db = loadDb();
    const demanda = db.demandas.find((x) => x.id === demandaId);
    if (!demanda || !matchesTenant(demanda.tenantId)) return null;
    const t = now();
    const os: OrdemServico = {
      id: uid('OS'),
      demandaId: demanda.id,
      fiscalId,
      fiscalNome,
      inscricao: demanda.inscricao ?? '—',
      endereco: demanda.endereco ?? demanda.bairro,
      bairro: demanda.bairro,
      status: 'atribuida',
      lat: demanda.lat,
      lng: demanda.lng,
      rotaOrdem: db.ordens.filter((o) => o.fiscalId === fiscalId).length + 1,
      createdAt: t,
      updatedAt: t,
    };
    mutate((d) => {
      d.ordens.push(os);
      const dem = d.demandas.find((x) => x.id === demandaId);
      if (dem) {
        dem.status = 'os_gerada';
        dem.updatedAt = t;
      }
    });
    void import('./push.js').then((m) => m.notifyNewOs(fiscalId, os.id, os.endereco));
    return os;
  },
  async listOrdens(fiscalId?: string) {
    const db = loadDb();
    let list = filterOrdens(db.ordens, db.demandas);
    if (fiscalId) list = list.filter((o) => o.fiscalId === fiscalId).sort((a, b) => a.rotaOrdem - b.rotaOrdem);
    else list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  },
  async patchOrdem(id: string, status: OsStatus) {
    const t = now();
    mutate((db) => {
      const o = db.ordens.find((x) => x.id === id);
      if (o) {
        o.status = status;
        o.updatedAt = t;
      }
    });
    return loadDb().ordens.find((x) => x.id === id) ?? null;
  },
  async homologar(id: string, aprovado: boolean) {
    const t = now();
    mutate((db) => {
      const o = db.ordens.find((x) => x.id === id);
      if (!o) return;
      o.status = aprovado ? 'homologada' : 'em_vistoria';
      o.updatedAt = t;
      if (aprovado) {
        const d = db.demandas.find((x) => x.id === o.demandaId);
        if (d) {
          d.status = 'concluida';
          d.updatedAt = t;
        }
      }
    });
  },
  async getVistoriaByOs(osId: string) {
    return loadDb().vistorias.find((v) => v.osId === osId) ?? null;
  },
  async createVistoria(osId: string) {
    const existing = loadDb().vistorias.find((v) => v.osId === osId);
    if (existing) return existing;
    const t = now();
    const v: Vistoria = {
      id: uid('V'),
      osId,
      checklist: {},
      divergencia: false,
      syncStatus: 'local',
      createdAt: t,
      updatedAt: t,
    };
    mutate((db) => db.vistorias.push(v));
    return v;
  },
  async patchVistoria(id: string, patch: Partial<Vistoria>) {
    const t = now();
    mutate((db) => {
      const v = db.vistorias.find((x) => x.id === id);
      if (v) Object.assign(v, patch, { updatedAt: t });
    });
    return loadDb().vistorias.find((x) => x.id === id) ?? null;
  },
  async addFoto(foto: VistoriaFoto) {
    mutate((db) => db.fotos.push(foto));
    return foto;
  },
  async listFotos(vistoriaId: string) {
    return loadDb().fotos.filter((f) => f.vistoriaId === vistoriaId);
  },
  async getFoto(id: string) {
    return loadDb().fotos.find((f) => f.id === id) ?? null;
  },
  assinaturaPath(vistoriaId: string) {
    return join(config.uploadsDir, vistoriaId, 'assinatura.png');
  },
  hasAssinatura(vistoriaId: string) {
    return existsSync(this.assinaturaPath(vistoriaId));
  },
  async saveAssinatura(vistoriaId: string, fiscalNome: string, buffer: Buffer) {
    const t = now();
    const p = this.assinaturaPath(vistoriaId);
    mkdirSync(join(config.uploadsDir, vistoriaId), { recursive: true });
    writeFileSync(p, buffer);
    return this.patchVistoria(vistoriaId, { assinaturaAt: t, assinaturaNome: fiscalNome });
  },
  async listFiscais() {
    return loadDb().users.filter((u) => u.role === 'fiscal').map(({ senha: _, ...u }) => u);
  },
  async getKpis() {
    const db = loadDb();
    const ordens = filterOrdens(db.ordens, db.demandas);
    const osIds = new Set(ordens.map((o) => o.id));
    const hoje = now().slice(0, 10);
    return {
      osHoje: ordens.filter((o) => o.createdAt.startsWith(hoje)).length || ordens.length,
      concluidas: ordens.filter((o) =>
        ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status),
      ).length,
      homolog: ordens.filter((o) => o.status === 'homologacao').length,
      divergencias: db.vistorias.filter((v) => v.divergencia && osIds.has(v.osId)).length,
      fiscais: db.users.filter((u) => u.role === 'fiscal'),
    };
  },
};

function mutate(fn: (db: DbShape) => void) {
  const db = loadDb();
  fn(db);
  saveDb(db);
}
