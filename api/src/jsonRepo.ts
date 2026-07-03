import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { getActiveTenantId } from './tenantContext.js';
import { countVisitasHoje } from './fiscal.js';
import { migrateLegacyTenantData, tenantDataDir, tenantDbPath, tenantUploadsDir } from './tenantPaths.js';
import {
  daysUntilPrazo,
  estimateRotaStats,
  filtrarOsAtivas,
  ordenarPorPrazoEProximidade,
  ordenarPorProximidade,
  type GeoPoint,
} from './rota.js';
import { countDemandasVencidas, ordensComPrazoAlerta } from './alertasPrazo.js';
import { resolvePrazoVistoria } from './prazoStatus.js';
import { filterDemandas, filterOrdens, matchesTenant } from './tenant.js';
import { skillsForFiscal } from './tipoVistoria.js';
import { ordenarComVroom } from './vroom.js';
import { migratePrazoRecords } from './migratePrazo.js';
import { buildTenantSeed } from './tenantSeed.js';
import { vistoriaTemAssinatura } from './vistoriaAssinatura.js';
import type { ImportRow } from './importCsv.js';
import type {
  AssinaturaModo,
  DbShape,
  Demanda,
  OrdemServico,
  OsStatus,
  Prioridade,
  User,
  Vistoria,
  VistoriaFoto,
} from './types.js';

const dbPath = () => tenantDbPath();

const now = () => new Date().toISOString();
export const uid = (p: string) => `${p}-${Date.now().toString(36)}`;

function empty(): DbShape {
  return { users: [], demandas: [], ordens: [], vistorias: [], fotos: [] };
}

function applyPrazoMigration(db: DbShape): DbShape {
  const { demandas, ordens, changed } = migratePrazoRecords(db.demandas, db.ordens, db.vistorias);
  if (!changed) return db;
  return { ...db, demandas, ordens };
}

export function loadDb(): DbShape {
  const p = dbPath();
  if (!existsSync(p)) return empty();
  const raw = JSON.parse(readFileSync(p, 'utf8')) as DbShape;
  if (!raw.fotos) raw.fotos = [];
  const migrated = applyPrazoMigration(raw);
  if (migrated !== raw) saveDb(migrated);
  return migrated;
}

export function saveDb(db: DbShape) {
  mkdirSync(tenantDataDir(), { recursive: true });
  writeFileSync(dbPath(), JSON.stringify(db, null, 2), 'utf8');
}

export function seedJson(): DbShape {
  const db = loadDb();
  if (db.users.length > 0) return db;
  const seeded = buildTenantSeed(getActiveTenantId());
  saveDb(seeded);
  return seeded;
}

export const jsonRepo = {
  mode: 'json' as const,
  async ensureSeed() {
    migrateLegacyTenantData();
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
    const prazoV = input.prazoVistoriaEm ?? input.prazo;
    const d: Demanda = {
      ...input,
      prazo: input.prazo ?? prazoV,
      prazoVistoriaEm: prazoV,
      tenantId: input.tenantId ?? getActiveTenantId(),
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
          tenantId: getActiveTenantId(),
          tipo: r.tipo,
          bairro: r.bairro,
          prioridade: r.prioridade,
          prazo: r.prazo,
          prazoVistoriaEm: r.prazo,
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
  async gerarOs(
    demandaId: string,
    fiscalId: string,
    fiscalNome: string,
    janela?: { visitaInicio?: string; visitaFim?: string },
  ) {
    const db = loadDb();
    const demanda = db.demandas.find((x) => x.id === demandaId);
    if (!demanda || !matchesTenant(demanda.tenantId)) return null;
    if (config.maxOsAtivasFiscal > 0) {
      const ativas = filtrarOsAtivas(
        filterOrdens(db.ordens, db.demandas).filter((o) => o.fiscalId === fiscalId),
      );
      if (ativas.length >= config.maxOsAtivasFiscal) return null;
    }
    if (config.maxVisitasDiaFiscal > 0) {
      const visitas = countVisitasHoje(db.ordens, db.vistorias, fiscalId);
      if (visitas >= config.maxVisitasDiaFiscal) return null;
    }
    const t = now();
    const prazoCampo = resolvePrazoVistoria(demanda)!;
    const os: OrdemServico = {
      id: uid('OS'),
      demandaId: demanda.id,
      fiscalId,
      fiscalNome,
      inscricao: demanda.inscricao ?? '—',
      endereco: demanda.endereco ?? demanda.bairro,
      bairro: demanda.bairro,
      tipo: demanda.tipo,
      finalidade: demanda.finalidade,
      dadosReferencia: demanda.dadosReferencia,
      prioridade: demanda.prioridade,
      prazo: prazoCampo,
      prazoCampoEm: prazoCampo,
      visitaInicio: janela?.visitaInicio,
      visitaFim: janela?.visitaFim,
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
        dem.dataInicioExecucaoEm = t;
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
  async patchOrdem(
    id: string,
    patch: { status?: OsStatus; visitaInicio?: string | null; visitaFim?: string | null },
  ) {
    const t = now();
    mutate((db) => {
      const o = db.ordens.find((x) => x.id === id);
      if (o) {
        if (patch.status != null) o.status = patch.status;
        if (patch.visitaInicio !== undefined) o.visitaInicio = patch.visitaInicio ?? undefined;
        if (patch.visitaFim !== undefined) o.visitaFim = patch.visitaFim ?? undefined;
        o.updatedAt = t;
      }
    });
    return loadDb().ordens.find((x) => x.id === id) ?? null;
  },
  async otimizarRota(fiscalId: string, start?: GeoPoint) {
    const db = loadDb();
    const ativas = filtrarOsAtivas(
      filterOrdens(db.ordens, db.demandas).filter((o) => o.fiscalId === fiscalId),
    );
    if (!ativas.length) {
      return {
        ordens: [] as OrdemServico[],
        paradas: 0,
        distanciaKm: 0,
        duracaoMinEst: 0,
        engine: 'prazo-proximidade' as const,
      };
    }
    const visitasHoje = countVisitasHoje(db.ordens, db.vistorias, fiscalId);
    const capRestante =
      config.maxVisitasDiaFiscal > 0
        ? Math.max(0, config.maxVisitasDiaFiscal - visitasHoje)
        : ativas.length;
    if (config.maxVisitasDiaFiscal > 0 && capRestante === 0) {
      return {
        ordens: [],
        paradas: 0,
        distanciaKm: 0,
        duracaoMinEst: 0,
        engine: 'prazo-proximidade' as const,
        visitasHoje,
        capacidadeRestante: 0,
      };
    }
    const fiscal = db.users.find((u) => u.id === fiscalId);
    const vehicleSkills = skillsForFiscal(fiscal?.tiposHabilitados);
    const origin = start ?? { lat: ativas[0].lat, lng: ativas[0].lng };
    let ordered: OrdemServico[];
    let engine: 'vroom' | 'prazo-proximidade' = 'prazo-proximidade';
    const vroomCap = config.maxVisitasDiaFiscal > 0 ? capRestante : undefined;
    if (config.vroomUrl && ativas.length >= 2) {
      const idx = await ordenarComVroom(config.vroomUrl, origin, ativas, vroomCap, vehicleSkills);
      if (idx) {
        ordered = idx.map((i) => ativas[i]);
        engine = 'vroom';
      } else {
        ordered = ordenarPorPrazoEProximidade(ativas, origin);
      }
    } else {
      ordered = ativas.length >= 2 ? ordenarPorPrazoEProximidade(ativas, origin) : ativas;
    }
    if (config.maxVisitasDiaFiscal > 0) {
      ordered = ordered.slice(0, capRestante);
    }
    const stats = estimateRotaStats(ordered, origin);
    const t = now();
    mutate((d) => {
      for (let i = 0; i < ordered.length; i++) {
        const o = d.ordens.find((x) => x.id === ordered[i].id);
        if (o) {
          o.rotaOrdem = i + 1;
          o.updatedAt = t;
        }
      }
    });
    const refreshed = loadDb();
    const ordens = filterOrdens(refreshed.ordens, refreshed.demandas)
      .filter((o) => o.fiscalId === fiscalId)
      .sort((a, b) => a.rotaOrdem - b.rotaOrdem);
    return {
      ordens,
      paradas: ordered.length,
      distanciaKm: stats.distanciaKm,
      duracaoMinEst: stats.duracaoMinEst,
      engine,
      visitasHoje,
      capacidadeRestante: config.maxVisitasDiaFiscal > 0 ? capRestante : undefined,
      tiposRota: [...new Set(ordered.map((o) => o.tipo).filter(Boolean))] as string[],
    };
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
    return join(tenantUploadsDir(), vistoriaId, 'assinatura.png');
  },
  hasAssinatura(vistoriaId: string) {
    const v = loadDb().vistorias.find((x) => x.id === vistoriaId);
    return vistoriaTemAssinatura(v, existsSync(this.assinaturaPath(vistoriaId)));
  },
  async saveAssinatura(vistoriaId: string, fiscalNome: string, buffer: Buffer) {
    const t = now();
    const p = this.assinaturaPath(vistoriaId);
    mkdirSync(join(tenantUploadsDir(), vistoriaId), { recursive: true });
    writeFileSync(p, buffer);
    return this.patchVistoria(vistoriaId, {
      assinaturaAt: t,
      assinaturaNome: fiscalNome,
      assinaturaModo: 'canvas',
      assinaturaRef: undefined,
    });
  },
  async saveAssinaturaCertificada(
    vistoriaId: string,
    fiscalNome: string,
    modo: AssinaturaModo,
    ref: string,
  ) {
    const t = now();
    return this.patchVistoria(vistoriaId, {
      assinaturaAt: t,
      assinaturaNome: fiscalNome,
      assinaturaModo: modo,
      assinaturaRef: ref,
    });
  },
  async getUserById(id: string) {
    const u = loadDb().users.find((x) => x.id === id);
    if (!u) return null;
    const { senha: _, ...rest } = u;
    return rest;
  },
  async patchFiscalTipos(id: string, tiposHabilitados: string[]) {
    let found = false;
    mutate((db) => {
      const u = db.users.find((x) => x.id === id && x.role === 'fiscal');
      if (!u) return;
      found = true;
      u.tiposHabilitados = tiposHabilitados.length ? tiposHabilitados : undefined;
    });
    if (!found) return null;
    return jsonRepo.getUserById(id);
  },
  async listFiscais() {
    return loadDb().users.filter((u) => u.role === 'fiscal').map(({ senha: _, ...u }) => u);
  },
  async countVisitasHojeFiscal(fiscalId: string) {
    const db = loadDb();
    return countVisitasHoje(db.ordens, db.vistorias, fiscalId);
  },
  async getKpis() {
    const db = loadDb();
    const ordens = filterOrdens(db.ordens, db.demandas);
    const demandas = filterDemandas(db.demandas);
    const osIds = new Set(ordens.map((o) => o.id));
    const hoje = now().slice(0, 10);
    const vMap = new Map(db.vistorias.map((v) => [v.osId, v]));
    return {
      osHoje: ordens.filter((o) => o.createdAt.startsWith(hoje)).length || ordens.length,
      concluidas: ordens.filter((o) =>
        ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status),
      ).length,
      homolog: ordens.filter((o) => o.status === 'homologacao').length,
      divergencias: db.vistorias.filter((v) => v.divergencia && osIds.has(v.osId)).length,
      visitasHoje: countVisitasHoje(db.ordens, db.vistorias),
      prazoVencido: ordensComPrazoAlerta(ordens, vMap).filter((o) => o.statusPrazo === 'VENCIDA').length,
      demandasVencidas: countDemandasVencidas(demandas),
      fiscais: db.users.filter((u) => u.role === 'fiscal'),
    };
  },
};

function mutate(fn: (db: DbShape) => void) {
  const db = loadDb();
  fn(db);
  saveDb(db);
}
