import cors from 'cors';
import express from 'express';
import { createRoutes } from './routes.js';
import { config, usePostgres } from './config.js';
import { ensureStorage } from './repo.js';
import { getActiveMunicipioNome, getActiveTenantId, tenantMiddleware } from './tenantContext.js';
import { assinaturaPadrao, listAssinaturaModos } from './assinaturaConfig.js';
import { listTenants } from './tenantRegistry.js';

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
    version: '0.4',
    storage: usePostgres() ? 'postgres+postgis' : 'json',
    municipio: config.municipioNome,
    tenantId: config.tenantId,
  });
});

app.get('/api/fisaval/tenants', (_req, res) => {
  res.json({
    multiTenant: config.multiTenant,
    defaultTenantId: config.tenantId,
    tenants: listTenants(),
  });
});

app.get('/api/fisaval/config', tenantMiddleware, (_req, res) => {
  res.json({
    municipio: getActiveMunicipioNome(),
    tenantId: getActiveTenantId(),
    version: '0.4',
    vroom: !!config.vroomUrl,
    checkinRadiusM: config.checkinRadiusM,
    maxOsAtivasFiscal: config.maxOsAtivasFiscal,
    maxVisitasDiaFiscal: config.maxVisitasDiaFiscal,
    tenantIsolated: process.env.TENANT_ISOLATED !== '0' && process.env.TENANT_ISOLATED !== 'false',
    multiTenant: config.multiTenant,
    assinaturaModos: listAssinaturaModos(),
    assinaturaPadrao: assinaturaPadrao(),
  });
});

app.use('/api/fisaval', tenantMiddleware, createRoutes());

async function main() {
  await ensureStorage();
  app.listen(config.port, () => {
    console.log(`FISAVAL API http://127.0.0.1:${config.port}`);
    const storage = usePostgres()
      ? 'PostgreSQL/PostGIS'
      : `JSON (tenant: ${config.tenantId})`;
    console.log(`  Storage: ${storage}`);
    console.log(`  POST /api/fisaval/auth/login → JWT`);
    console.log(`  POST /api/fisaval/vistorias/:id/fotos`);
  });
}

void main();
