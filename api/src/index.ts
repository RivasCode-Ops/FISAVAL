import cors from 'cors';
import express from 'express';
import { createRoutes } from './routes.js';
import { config, usePostgres } from './config.js';
import { ensureStorage } from './repo.js';

const app = express();
const corsOrigin = config.corsOrigin
  ? config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'fisaval-api',
    version: '0.3',
    storage: usePostgres() ? 'postgres+postgis' : 'json',
  });
});

app.use('/api/fisaval', createRoutes());

async function main() {
  await ensureStorage();
  app.listen(config.port, () => {
    console.log(`FISAVAL API http://127.0.0.1:${config.port}`);
    console.log(`  Storage: ${usePostgres() ? 'PostgreSQL/PostGIS' : 'JSON (api/data/fisaval.json)'}`);
    console.log(`  POST /api/fisaval/auth/login → JWT`);
    console.log(`  POST /api/fisaval/vistorias/:id/fotos`);
  });
}

void main();
