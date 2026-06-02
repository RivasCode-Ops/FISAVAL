# Fase 2 — API + dados compartilhados

## Rodar app + API (recomendado para testar produção local)

Terminal 1:

```powershell
cd c:\_PROJETOS\E-FISCAL\api
npm install
npm run dev
```

Terminal 2:

```powershell
cd c:\_PROJETOS\E-FISCAL\app
copy .env.example .env
npm install
npm run dev
```

Abra http://127.0.0.1:5192 — login `gestor@demo` / `demo123`.

Os dados ficam em `api/data/fisaval.json` (backup fácil).

## GitHub Pages (só front)

O site em https://rivascode-ops.github.io/FISAVAL/ continua **modo local** (IndexedDB no navegador), a menos que você hospede a API em um servidor com HTTPS e configure `VITE_API_URL` no build.

## Próximo (fase 3)

- PostgreSQL + PostGIS (`docker-compose.yml`)
- Fotos em S3/MinIO
- JWT + HTTPS
- Hospedar API (Render, Railway, VPS da prefeitura)
