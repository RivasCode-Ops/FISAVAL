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
  /** Raio máximo (m) para check-in no imóvel. 0 = não valida distância. */
  checkinRadiusM: Number(process.env.CHECKIN_RADIUS_M) || 200,
  /** Máximo de OS ativas por fiscal; 0 = sem limite. */
  maxOsAtivasFiscal: Number(process.env.MAX_OS_ATIVAS_FISCAL) || 0,
  /** Máximo de vistorias concluídas por fiscal por dia; 0 = sem limite. */
  maxVisitasDiaFiscal: Number(process.env.MAX_VISITAS_DIA_FISCAL) || 0,
  /** Aceita header X-Tenant-Id (várias prefeituras na mesma API). */
  multiTenant: process.env.MULTI_TENANT === '1' || process.env.MULTI_TENANT === 'true',
  /** E-mails com visão cross-tenant (vírgula). Exige MULTI_TENANT. */
  superAdminEmails: (process.env.SUPER_ADMIN_EMAILS || 'admin@demo')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

export const usePostgres = () => !!config.databaseUrl;
