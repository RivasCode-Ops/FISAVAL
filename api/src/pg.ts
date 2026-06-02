import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';
import type { Demanda, OrdemServico, OsStatus, Prioridade, User, Vistoria, VistoriaFoto } from './types.js';
import { uid } from './jsonRepo.js';

const __dir = dirname(fileURLToPath(import.meta.url));
let pool: pg.Pool | null = null;
let pgHasGeom = false;

export function getPool(): pg.Pool {
  if (!pool) pool = new pg.Pool({ connectionString: config.databaseUrl });
  return pool;
}

export async function initPgSchema() {
  const p = getPool();
  try {
    await p.query('CREATE EXTENSION IF NOT EXISTS postgis');
    const sql = readFileSync(join(__dir, '..', 'sql', '001_init.sql'), 'utf8');
    await p.query(sql);
    pgHasGeom = true;
    console.log('PostgreSQL: schema PostGIS');
  } catch (err) {
    console.warn('PostGIS indisponível, usando schema plain:', err);
    const plain = readFileSync(join(__dir, '..', 'sql', '001_init_plain.sql'), 'utf8');
    await p.query(plain);
    pgHasGeom = false;
  }
}

type PgQuery = Pick<pg.Pool, 'query'>;

async function insertDemandaRowQ(
  q: PgQuery,
  values: {
    id: string;
    tipo: string;
    bairro: string;
    prioridade: string;
    prazo: string;
    status: string;
    inscricao: string | null;
    endereco: string | null;
    lat: number;
    lng: number;
    createdAt: string;
    updatedAt?: string;
  },
) {
  const t2 = values.updatedAt ?? values.createdAt;
  if (pgHasGeom) {
    await q.query(
      `INSERT INTO demandas (id, tipo, bairro, prioridade, prazo, status, inscricao, endereco, lat, lng, geom, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ST_SetSRID(ST_MakePoint($10,$9),4326)::geography, $11,$12)`,
      [
        values.id,
        values.tipo,
        values.bairro,
        values.prioridade,
        values.prazo,
        values.status,
        values.inscricao,
        values.endereco,
        values.lat,
        values.lng,
        values.createdAt,
        t2,
      ],
    );
  } else {
    await q.query(
      `INSERT INTO demandas (id, tipo, bairro, prioridade, prazo, status, inscricao, endereco, lat, lng, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        values.id,
        values.tipo,
        values.bairro,
        values.prioridade,
        values.prazo,
        values.status,
        values.inscricao,
        values.endereco,
        values.lat,
        values.lng,
        values.createdAt,
        t2,
      ],
    );
  }
}

const now = () => new Date().toISOString();

function rowDemanda(r: Record<string, unknown>): Demanda {
  return {
    id: r.id as string,
    tipo: r.tipo as string,
    bairro: r.bairro as string,
    prioridade: r.prioridade as Prioridade,
    prazo: r.prazo as string,
    status: r.status as Demanda['status'],
    inscricao: (r.inscricao as string) ?? undefined,
    endereco: (r.endereco as string) ?? undefined,
    lat: Number(r.lat),
    lng: Number(r.lng),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowOrdem(r: Record<string, unknown>): OrdemServico {
  return {
    id: r.id as string,
    demandaId: r.demanda_id as string,
    fiscalId: r.fiscal_id as string,
    fiscalNome: r.fiscal_nome as string,
    inscricao: r.inscricao as string,
    endereco: r.endereco as string,
    bairro: r.bairro as string,
    status: r.status as OsStatus,
    lat: Number(r.lat),
    lng: Number(r.lng),
    rotaOrdem: Number(r.rota_ordem),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowVistoria(r: Record<string, unknown>): Vistoria {
  return {
    id: r.id as string,
    osId: r.os_id as string,
    checklist: (r.checklist as Record<string, boolean>) ?? {},
    divergencia: Boolean(r.divergencia),
    justificativa: (r.justificativa as string) ?? undefined,
    checkInLat: r.check_in_lat != null ? Number(r.check_in_lat) : undefined,
    checkInLng: r.check_in_lng != null ? Number(r.check_in_lng) : undefined,
    checkInAt: r.check_in_at ? new Date(r.check_in_at as string).toISOString() : undefined,
    concluidaAt: r.concluida_at ? new Date(r.concluida_at as string).toISOString() : undefined,
    syncStatus: r.sync_status as Vistoria['syncStatus'],
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowFoto(r: Record<string, unknown>): VistoriaFoto {
  return {
    id: r.id as string,
    vistoriaId: r.vistoria_id as string,
    filename: r.filename as string,
    mime: r.mime as string,
    sizeBytes: Number(r.size_bytes),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function seedPg() {
  const { rows } = await getPool().query('SELECT COUNT(*)::int AS c FROM users');
  if (rows[0].c > 0) return;
  const t = now();
  const users: User[] = [
    { id: 'u-gestor', email: 'gestor@demo', nome: 'Gestor Finanças', role: 'gestor', senha: 'demo123' },
    { id: 'u-fiscal1', email: 'fiscal@demo', nome: 'Ana Silva', role: 'fiscal', senha: 'demo123' },
    { id: 'u-fiscal2', email: 'carlos@demo', nome: 'Carlos Mendes', role: 'fiscal', senha: 'demo123' },
    { id: 'u-admin', email: 'admin@demo', nome: 'Administrador', role: 'admin', senha: 'demo123' },
  ];
  for (const u of users) {
    await getPool().query(
      'INSERT INTO users (id, email, nome, role, senha) VALUES ($1,$2,$3,$4,$5)',
      [u.id, u.email, u.nome, u.role, u.senha],
    );
  }
  await insertDemandaRowQ(getPool(), {
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
  });
  await getPool().query(
    `INSERT INTO ordens (id, demanda_id, fiscal_id, fiscal_nome, inscricao, endereco, bairro, status, lat, lng, rota_ordem, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11,$11)`,
    [
      'OS-8821',
      'D-1042',
      'u-fiscal1',
      'Ana Silva',
      '12.034.0056.0001',
      'R. das Flores, 123',
      'Centro',
      'atribuida',
      -23.5505,
      -46.6333,
      t,
    ],
  );
}

export const pgRepo = {
  mode: 'postgres' as const,
  async ensureSeed() {
    await initPgSchema();
    await seedPg();
  },
  async login(email: string, senha: string) {
    const { rows } = await getPool().query('SELECT * FROM users WHERE email = $1 AND senha = $2', [
      email,
      senha,
    ]);
    return (rows[0] as User | undefined) ?? null;
  },
  async bootstrap() {
    const [u, d, o, v, f] = await Promise.all([
      getPool().query('SELECT id, email, nome, role FROM users'),
      getPool().query('SELECT * FROM demandas ORDER BY updated_at DESC'),
      getPool().query('SELECT * FROM ordens ORDER BY updated_at DESC'),
      getPool().query('SELECT * FROM vistorias'),
      getPool().query('SELECT * FROM vistoria_fotos'),
    ]);
    return {
      users: u.rows,
      demandas: d.rows.map((r) => rowDemanda(r)),
      ordens: o.rows.map((r) => rowOrdem(r)),
      vistorias: v.rows.map((r) => rowVistoria(r)),
      fotos: f.rows.map((r) => rowFoto(r)),
    };
  },
  async syncReplace(partial: { demandas?: Demanda[]; ordens?: OrdemServico[]; vistorias?: Vistoria[] }) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      if (partial.demandas) {
        await client.query('DELETE FROM demandas');
        for (const x of partial.demandas) {
          await insertDemandaRowQ(client, {
            id: x.id,
            tipo: x.tipo,
            bairro: x.bairro,
            prioridade: x.prioridade,
            prazo: x.prazo,
            status: x.status,
            inscricao: x.inscricao ?? null,
            endereco: x.endereco ?? null,
            lat: x.lat,
            lng: x.lng,
            createdAt: x.createdAt,
            updatedAt: x.updatedAt,
          });
        }
      }
      if (partial.ordens) {
        await client.query('DELETE FROM ordens');
        for (const x of partial.ordens) {
          await client.query(
            `INSERT INTO ordens (id, demanda_id, fiscal_id, fiscal_nome, inscricao, endereco, bairro, status, lat, lng, rota_ordem, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              x.id,
              x.demandaId,
              x.fiscalId,
              x.fiscalNome,
              x.inscricao,
              x.endereco,
              x.bairro,
              x.status,
              x.lat,
              x.lng,
              x.rotaOrdem,
              x.createdAt,
              x.updatedAt,
            ],
          );
        }
      }
      if (partial.vistorias) {
        await client.query('DELETE FROM vistorias');
        for (const x of partial.vistorias) {
          await client.query(
            `INSERT INTO vistorias (id, os_id, checklist, divergencia, justificativa, check_in_lat, check_in_lng, check_in_at, concluida_at, sync_status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              x.id,
              x.osId,
              JSON.stringify(x.checklist),
              x.divergencia,
              x.justificativa ?? null,
              x.checkInLat ?? null,
              x.checkInLng ?? null,
              x.checkInAt ?? null,
              x.concluidaAt ?? null,
              x.syncStatus,
              x.createdAt,
              x.updatedAt,
            ],
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  async listDemandas() {
    const { rows } = await getPool().query('SELECT * FROM demandas ORDER BY updated_at DESC');
    return rows.map((r) => rowDemanda(r));
  },
  async createDemanda(input: {
    tipo: string;
    bairro: string;
    prioridade: Prioridade;
    prazo: string;
    endereco?: string;
    inscricao?: string;
    lat?: number;
    lng?: number;
  }) {
    const t = now();
    const id = uid('D');
    const lat = input.lat ?? -23.55;
    const lng = input.lng ?? -46.633;
    await insertDemandaRowQ(getPool(), {
      id,
      tipo: input.tipo,
      bairro: input.bairro,
      prioridade: input.prioridade,
      prazo: input.prazo,
      status: 'aberta',
      inscricao: input.inscricao ?? null,
      endereco: input.endereco ?? null,
      lat,
      lng,
      createdAt: t,
    });
    return rowDemanda(
      (
        await getPool().query('SELECT * FROM demandas WHERE id = $1', [id])
      ).rows[0] as Record<string, unknown>,
    );
  },
  async gerarOs(demandaId: string, fiscalId: string, fiscalNome: string) {
    const dem = (
      await getPool().query('SELECT * FROM demandas WHERE id = $1', [demandaId])
    ).rows[0] as Record<string, unknown> | undefined;
    if (!dem) return null;
    const t = now();
    const id = uid('OS');
    const { rows: cnt } = await getPool().query(
      'SELECT COUNT(*)::int AS c FROM ordens WHERE fiscal_id = $1',
      [fiscalId],
    );
    await getPool().query(
      `INSERT INTO ordens (id, demanda_id, fiscal_id, fiscal_nome, inscricao, endereco, bairro, status, lat, lng, rota_ordem, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'atribuida',$8,$9,$10,$11,$11)`,
      [
        id,
        demandaId,
        fiscalId,
        fiscalNome,
        dem.inscricao ?? '—',
        dem.endereco ?? dem.bairro,
        dem.bairro,
        dem.lat,
        dem.lng,
        cnt[0].c + 1,
        t,
      ],
    );
    await getPool().query(`UPDATE demandas SET status = 'os_gerada', updated_at = $2 WHERE id = $1`, [
      demandaId,
      t,
    ]);
    return rowOrdem(
      (await getPool().query('SELECT * FROM ordens WHERE id = $1', [id])).rows[0] as Record<string, unknown>,
    );
  },
  async listOrdens(fiscalId?: string) {
    if (fiscalId) {
      const { rows } = await getPool().query(
        'SELECT * FROM ordens WHERE fiscal_id = $1 ORDER BY rota_ordem',
        [fiscalId],
      );
      return rows.map((r) => rowOrdem(r));
    }
    const { rows } = await getPool().query('SELECT * FROM ordens ORDER BY updated_at DESC');
    return rows.map((r) => rowOrdem(r));
  },
  async patchOrdem(id: string, status: OsStatus) {
    const t = now();
    await getPool().query('UPDATE ordens SET status = $2, updated_at = $3 WHERE id = $1', [id, status, t]);
    const { rows } = await getPool().query('SELECT * FROM ordens WHERE id = $1', [id]);
    return rows[0] ? rowOrdem(rows[0]) : null;
  },
  async homologar(id: string, aprovado: boolean) {
    const t = now();
    const status = aprovado ? 'homologada' : 'em_vistoria';
    await getPool().query('UPDATE ordens SET status = $2, updated_at = $3 WHERE id = $1', [id, status, t]);
    if (aprovado) {
      const { rows } = await getPool().query('SELECT demanda_id FROM ordens WHERE id = $1', [id]);
      if (rows[0]) {
        await getPool().query(`UPDATE demandas SET status = 'concluida', updated_at = $2 WHERE id = $1`, [
          rows[0].demanda_id,
          t,
        ]);
      }
    }
  },
  async getVistoriaByOs(osId: string) {
    const { rows } = await getPool().query('SELECT * FROM vistorias WHERE os_id = $1', [osId]);
    return rows[0] ? rowVistoria(rows[0]) : null;
  },
  async createVistoria(osId: string) {
    const existing = await pgRepo.getVistoriaByOs(osId);
    if (existing) return existing;
    const t = now();
    const id = uid('V');
    await getPool().query(
      `INSERT INTO vistorias (id, os_id, checklist, divergencia, sync_status, created_at, updated_at)
       VALUES ($1,$2,'{}',false,'local',$3,$3)`,
      [id, osId, t],
    );
    return rowVistoria(
      (await getPool().query('SELECT * FROM vistorias WHERE id = $1', [id])).rows[0] as Record<string, unknown>,
    );
  },
  async patchVistoria(id: string, patch: Partial<Vistoria>) {
    const t = now();
    const cur = (
      await getPool().query('SELECT * FROM vistorias WHERE id = $1', [id])
    ).rows[0] as Record<string, unknown>;
    if (!cur) return null;
    const merged = { ...rowVistoria(cur), ...patch, updatedAt: t };
    await getPool().query(
      `UPDATE vistorias SET checklist = $2, divergencia = $3, justificativa = $4,
       check_in_lat = $5, check_in_lng = $6, check_in_at = $7, concluida_at = $8, sync_status = $9, updated_at = $10
       WHERE id = $1`,
      [
        id,
        JSON.stringify(merged.checklist),
        merged.divergencia,
        merged.justificativa ?? null,
        merged.checkInLat ?? null,
        merged.checkInLng ?? null,
        merged.checkInAt ?? null,
        merged.concluidaAt ?? null,
        merged.syncStatus,
        t,
      ],
    );
    return merged;
  },
  async addFoto(foto: VistoriaFoto) {
    await getPool().query(
      'INSERT INTO vistoria_fotos (id, vistoria_id, filename, mime, size_bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [foto.id, foto.vistoriaId, foto.filename, foto.mime, foto.sizeBytes, foto.createdAt],
    );
    return foto;
  },
  async listFotos(vistoriaId: string) {
    const { rows } = await getPool().query(
      'SELECT * FROM vistoria_fotos WHERE vistoria_id = $1 ORDER BY created_at',
      [vistoriaId],
    );
    return rows.map((r) => rowFoto(r));
  },
  async getFoto(id: string) {
    const { rows } = await getPool().query('SELECT * FROM vistoria_fotos WHERE id = $1', [id]);
    return rows[0] ? rowFoto(rows[0]) : null;
  },
  async listFiscais() {
    const { rows } = await getPool().query(`SELECT id, email, nome, role FROM users WHERE role = 'fiscal'`);
    return rows;
  },
  async getKpis() {
    const hoje = now().slice(0, 10);
    const { rows: ordens } = await getPool().query('SELECT status, created_at FROM ordens');
    const { rows: vistorias } = await getPool().query('SELECT divergencia FROM vistorias');
    const { rows: fiscais } = await getPool().query(`SELECT id, email, nome, role FROM users WHERE role = 'fiscal'`);
    const osHoje = ordens.filter((o) => String(o.created_at).startsWith(hoje)).length || ordens.length;
    return {
      osHoje,
      concluidas: ordens.filter((o) =>
        ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status as string),
      ).length,
      homolog: ordens.filter((o) => o.status === 'homologacao').length,
      divergencias: vistorias.filter((v) => v.divergencia).length,
      fiscais,
    };
  },
};
