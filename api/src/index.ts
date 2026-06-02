import cors from 'cors';
import express from 'express';
import { createRoutes } from './routes.js';
import { ensureSeed } from './store.js';

ensureSeed();

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'fisaval-api', version: '0.2' });
});

app.use('/api/fisaval', createRoutes());

const port = Number(process.env.PORT) || 8790;
app.listen(port, () => {
  console.log(`FISAVAL API http://127.0.0.1:${port}`);
  console.log(`  GET  /api/fisaval/bootstrap`);
  console.log(`  POST /api/fisaval/auth/login`);
});
