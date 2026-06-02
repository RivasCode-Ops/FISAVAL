# Hospedar a API (dados compartilhados + fotos)

O front no GitHub Pages roda só no navegador. Para **vários dispositivos** com os mesmos dados e **upload de fotos**, hospede a API com HTTPS.

**Passo a passo completo (Pages + Render + secret):** [DEPLOY-ONLINE.md](DEPLOY-ONLINE.md)

## Opção A — Docker (VPS / servidor da prefeitura)

```bash
# PostGIS
docker compose up -d

# API
cd api
docker build -t fisaval-api .
docker run -d -p 8790:8790 \
  -e DATABASE_URL=postgres://fisaval:fisaval@host.docker.internal:5432/fisaval \
  -e JWT_SECRET=segredo-forte \
  -v fisaval_uploads:/app/uploads \
  fisaval-api
```

## Opção B — Render / Railway

1. Crie um **PostgreSQL** (ou use PostGIS em VPS).
2. Web Service apontando para `api/` — build: `npm ci && npm run build`, start: `npm start`.
3. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `UPLOADS_DIR=uploads`, `PORT=8790`.
4. Disco persistente ou volume para `uploads/` (fotos).

## Front apontando para a API

No build do app (CI ou local):

```env
VITE_API_URL=https://sua-api.exemplo.com
```

```powershell
cd app
npm run build:pages
cd ..
node scripts/copy-to-docs.mjs
```

Ou configure `VITE_API_URL` no workflow `.github/workflows/pages.yml` como secret `VITE_API_URL` no step de build.

## Checklist produção

- [ ] `JWT_SECRET` forte (não usar o valor de desenvolvimento)
- [ ] HTTPS na API e no site
- [ ] Backup de PostgreSQL e pasta `uploads/`
- [ ] CORS: API já usa `cors()` aberto — restrinja origem em produção se necessário
