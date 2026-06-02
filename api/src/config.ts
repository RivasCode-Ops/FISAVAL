import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  port: Number(process.env.PORT) || 8790,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fisaval-dev-secret-trocar-em-producao',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  dataDir: process.env.DATA_DIR || join(apiRoot, 'data'),
  /** Origens CORS separadas por vírgula; vazio = qualquer origem (dev). */
  corsOrigin: process.env.CORS_ORIGIN || '',
  vapidPublic: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivate: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:gestor@fisaval.local',
  municipioNome: process.env.MUNICIPIO_NOME || 'Prefeitura Municipal (demo)',
  tenantId: process.env.TENANT_ID || 'demo',
  /** URL do serviço VROOM (ex. http://127.0.0.1:3000). Vazio = vizinho mais próximo. */
  vroomUrl: process.env.VROOM_URL || '',
};

export const usePostgres = () => !!config.databaseUrl;
