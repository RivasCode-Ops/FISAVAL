import cors from 'cors';
import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '..', 'data');
const storePath = join(dataDir, 'sync-log.json');

function readLog(): unknown[] {
  if (!existsSync(storePath)) return [];
  return JSON.parse(readFileSync(storePath, 'utf8')) as unknown[];
}

function appendLog(entry: unknown) {
  mkdirSync(dataDir, { recursive: true });
  const log = readLog();
  log.push({ ...entry as object, receivedAt: new Date().toISOString() });
  writeFileSync(storePath, JSON.stringify(log.slice(-500), null, 2));
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'fisaval-api' });
});

app.post('/api/fisaval/sync/push', (req, res) => {
  appendLog(req.body);
  res.json({ ok: true, message: 'Recebido (log local em api/data)' });
});

app.get('/api/fisaval/sync/log', (_req, res) => {
  res.json(readLog());
});

const port = Number(process.env.PORT) || 8790;
app.listen(port, () => {
  console.log(`fisaval-api http://127.0.0.1:${port}`);
  console.log(`  POST /api/fisaval/sync/push`);
});
