import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { authRequired, signToken } from './auth.js';
import { config } from './config.js';
import { getRepo } from './repo.js';
import { uid } from './jsonRepo.js';
import type { Demanda, OrdemServico, OsStatus, Prioridade, Vistoria } from './types.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function asyncHandler(
  fn: (req: import('express').Request, res: import('express').Response) => Promise<void>,
) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    void fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Erro interno' });
    });
  };
}

export function createRoutes(): Router {
  const router = Router();
  mkdirSync(config.uploadsDir, { recursive: true });

  router.post(
    '/auth/login',
    asyncHandler(async (req, res) => {
      const { email, senha } = req.body as { email?: string; senha?: string };
      const repo = getRepo();
      const user = await repo.login(String(email || '').trim().toLowerCase(), String(senha || ''));
      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        nome: user.nome,
      });
      res.json({
        token,
        user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
      });
    }),
  );

  router.use(authRequired);

  router.get(
    '/bootstrap',
    asyncHandler(async (_req, res) => {
      res.json(await getRepo().bootstrap());
    }),
  );

  router.post(
    '/sync/replace',
    asyncHandler(async (req, res) => {
      const body = req.body as {
        demandas?: Demanda[];
        ordens?: OrdemServico[];
        vistorias?: Vistoria[];
      };
      await getRepo().syncReplace(body);
      res.json({ ok: true });
    }),
  );

  router.get(
    '/demandas',
    asyncHandler(async (_req, res) => {
      res.json(await getRepo().listDemandas());
    }),
  );

  router.post(
    '/demandas',
    asyncHandler(async (req, res) => {
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
      const d = await getRepo().createDemanda({
        ...input,
        lat: input.lat ?? -23.55,
        lng: input.lng ?? -46.633,
      });
      res.status(201).json(d);
    }),
  );

  router.post(
    '/demandas/:id/gerar-os',
    asyncHandler(async (req, res) => {
      const { fiscalId, fiscalNome } = req.body as { fiscalId: string; fiscalNome: string };
      const os = await getRepo().gerarOs(req.params.id, fiscalId, fiscalNome);
      if (!os) {
        res.status(404).json({ error: 'Demanda não encontrada' });
        return;
      }
      res.status(201).json(os);
    }),
  );

  router.get(
    '/ordens',
    asyncHandler(async (req, res) => {
      const fiscalId = req.query.fiscalId as string | undefined;
      res.json(await getRepo().listOrdens(fiscalId));
    }),
  );

  router.patch(
    '/ordens/:id',
    asyncHandler(async (req, res) => {
      const { status } = req.body as { status: OsStatus };
      res.json(await getRepo().patchOrdem(req.params.id, status));
    }),
  );

  router.post(
    '/ordens/:id/homologar',
    asyncHandler(async (req, res) => {
      const { aprovado } = req.body as { aprovado: boolean };
      await getRepo().homologar(req.params.id, aprovado);
      res.json({ ok: true });
    }),
  );

  router.get(
    '/vistorias',
    asyncHandler(async (req, res) => {
      const osId = req.query.osId as string;
      res.json(await getRepo().getVistoriaByOs(osId));
    }),
  );

  router.post(
    '/vistorias',
    asyncHandler(async (req, res) => {
      const { osId } = req.body as { osId: string };
      res.status(201).json(await getRepo().createVistoria(osId));
    }),
  );

  router.patch(
    '/vistorias/:id',
    asyncHandler(async (req, res) => {
      res.json(await getRepo().patchVistoria(req.params.id, req.body));
    }),
  );

  router.get(
    '/vistorias/:id/fotos',
    asyncHandler(async (req, res) => {
      res.json(await getRepo().listFotos(req.params.id));
    }),
  );

  router.post(
    '/vistorias/:id/fotos',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        res.status(400).json({ error: 'Arquivo obrigatório (campo file)' });
        return;
      }
      const vistoriaId = req.params.id;
      const fotoId = uid('F');
      const ext = req.file.mimetype.includes('png') ? 'png' : 'jpg';
      const filename = `${fotoId}.${ext}`;
      const dir = join(config.uploadsDir, vistoriaId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), req.file.buffer);
      const foto = await getRepo().addFoto({
        id: fotoId,
        vistoriaId,
        filename,
        mime: req.file.mimetype,
        sizeBytes: req.file.size,
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(foto);
    }),
  );

  router.get(
    '/fotos/:id/file',
    asyncHandler(async (req, res) => {
      const foto = await getRepo().getFoto(req.params.id);
      if (!foto) {
        res.status(404).json({ error: 'Foto não encontrada' });
        return;
      }
      const filePath = resolve(config.uploadsDir, foto.vistoriaId, foto.filename);
      if (!existsSync(filePath)) {
        res.status(404).json({ error: 'Arquivo ausente' });
        return;
      }
      res.setHeader('Content-Type', foto.mime);
      res.sendFile(filePath);
    }),
  );

  router.get(
    '/fiscais',
    asyncHandler(async (_req, res) => {
      res.json(await getRepo().listFiscais());
    }),
  );

  router.get(
    '/kpis',
    asyncHandler(async (_req, res) => {
      res.json(await getRepo().getKpis());
    }),
  );

  return router;
}
