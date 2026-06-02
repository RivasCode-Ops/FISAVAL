import { Router } from 'express';
import {
  ensureSeed,
  loadDb,
  mutate,
  uid,
  type Demanda,
  type OrdemServico,
  type OsStatus,
  type Prioridade,
  type Vistoria,
} from './store.js';

const now = () => new Date().toISOString();

export function createRoutes(): Router {
  const router = Router();
  ensureSeed();

  router.post('/auth/login', (req, res) => {
    const { email, senha } = req.body as { email?: string; senha?: string };
    const db = loadDb();
    const user = db.users.find((u) => u.email === String(email || '').trim().toLowerCase());
    if (!user || user.senha !== senha) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }
    res.json({
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    });
  });

  router.get('/bootstrap', (_req, res) => {
    const db = loadDb();
    res.json({
      users: db.users.map(({ senha: _, ...u }) => u),
      demandas: db.demandas,
      ordens: db.ordens,
      vistorias: db.vistorias,
    });
  });

  router.post('/sync/replace', (req, res) => {
    const body = req.body as {
      demandas?: Demanda[];
      ordens?: OrdemServico[];
      vistorias?: Vistoria[];
    };
    mutate((db) => {
      if (body.demandas) db.demandas = body.demandas;
      if (body.ordens) db.ordens = body.ordens;
      if (body.vistorias) db.vistorias = body.vistorias;
    });
    res.json({ ok: true });
  });

  router.get('/demandas', (_req, res) => {
    res.json(loadDb().demandas);
  });

  router.post('/demandas', (req, res) => {
    const input = req.body as {
      tipo: string;
      bairro: string;
      prioridade: Prioridade;
      prazo: string;
      endereco?: string;
      inscricao?: string;
      lat?: number;
      lng?: number;
    };
    const t = now();
    const d: Demanda = {
      id: uid('D'),
      tipo: input.tipo,
      bairro: input.bairro,
      prioridade: input.prioridade,
      prazo: input.prazo,
      status: 'aberta',
      endereco: input.endereco,
      inscricao: input.inscricao,
      lat: input.lat ?? -23.55,
      lng: input.lng ?? -46.633,
      createdAt: t,
      updatedAt: t,
    };
    mutate((db) => {
      db.demandas.push(d);
    });
    res.status(201).json(d);
  });

  router.post('/demandas/:id/gerar-os', (req, res) => {
    const { fiscalId, fiscalNome } = req.body as { fiscalId: string; fiscalNome: string };
    const db = loadDb();
    const demanda = db.demandas.find((x) => x.id === req.params.id);
    if (!demanda) {
      res.status(404).json({ error: 'Demanda não encontrada' });
      return;
    }
    const count = db.ordens.filter((o) => o.fiscalId === fiscalId).length;
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
      rotaOrdem: count + 1,
      createdAt: t,
      updatedAt: t,
    };
    mutate((d) => {
      d.ordens.push(os);
      const dem = d.demandas.find((x) => x.id === demanda.id);
      if (dem) {
        dem.status = 'os_gerada';
        dem.updatedAt = t;
      }
    });
    res.status(201).json(os);
  });

  router.get('/ordens', (req, res) => {
    const db = loadDb();
    const fiscalId = req.query.fiscalId as string | undefined;
    let list = db.ordens;
    if (fiscalId) list = list.filter((o) => o.fiscalId === fiscalId).sort((a, b) => a.rotaOrdem - b.rotaOrdem);
    else list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(list);
  });

  router.patch('/ordens/:id', (req, res) => {
    const { status } = req.body as { status: OsStatus };
    const t = now();
    mutate((db) => {
      const o = db.ordens.find((x) => x.id === req.params.id);
      if (o) {
        o.status = status;
        o.updatedAt = t;
      }
    });
    res.json(loadDb().ordens.find((x) => x.id === req.params.id));
  });

  router.post('/ordens/:id/homologar', (req, res) => {
    const { aprovado } = req.body as { aprovado: boolean };
    const t = now();
    mutate((db) => {
      const o = db.ordens.find((x) => x.id === req.params.id);
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
    res.json({ ok: true });
  });

  router.get('/vistorias', (req, res) => {
    const osId = req.query.osId as string;
    const db = loadDb();
    res.json(db.vistorias.find((v) => v.osId === osId) ?? null);
  });

  router.post('/vistorias', (req, res) => {
    const { osId } = req.body as { osId: string };
    const db = loadDb();
    const existing = db.vistorias.find((v) => v.osId === osId);
    if (existing) {
      res.json(existing);
      return;
    }
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
    mutate((d) => {
      d.vistorias.push(v);
    });
    res.status(201).json(v);
  });

  router.patch('/vistorias/:id', (req, res) => {
    const t = now();
    mutate((db) => {
      const v = db.vistorias.find((x) => x.id === req.params.id);
      if (v) Object.assign(v, req.body, { updatedAt: t });
    });
    res.json(loadDb().vistorias.find((x) => x.id === req.params.id));
  });

  router.get('/fiscais', (_req, res) => {
    res.json(loadDb().users.filter((u) => u.role === 'fiscal').map(({ senha: _, ...u }) => u));
  });

  router.get('/kpis', (_req, res) => {
    const db = loadDb();
    const hoje = now().slice(0, 10);
    const osHoje = db.ordens.filter((o) => o.createdAt.startsWith(hoje)).length;
    const concluidas = db.ordens.filter((o) =>
      ['concluida', 'homologacao', 'homologada', 'pendente_sync'].includes(o.status),
    ).length;
    const homolog = db.ordens.filter((o) => o.status === 'homologacao').length;
    const divergencias = db.vistorias.filter((v) => v.divergencia).length;
    res.json({
      osHoje: osHoje || db.ordens.length,
      concluidas,
      homolog,
      divergencias,
      fiscais: db.users.filter((u) => u.role === 'fiscal'),
    });
  });

  return router;
}
