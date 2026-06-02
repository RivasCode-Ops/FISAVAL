# Fase 3 — PostgreSQL, JWT e fotos

## Subir banco PostGIS

```powershell
cd c:\_PROJETOS\E-FISCAL
docker compose up -d
```

## Configurar API

```powershell
cd api
copy .env.example .env
```

Edite `api/.env`:

```env
DATABASE_URL=postgres://fisaval:fisaval@localhost:5432/fisaval
JWT_SECRET=um-segredo-forte-aqui
UPLOADS_DIR=uploads
```

```powershell
npm install
npm run dev
```

## App

```powershell
cd ..\app
copy .env.example .env
npm run dev
```

Login → JWT automático → upload de fotos na aba Campo (com API ligada).

## Sem Docker

API continua funcionando em modo **JSON** (`api/data/fisaval.json`) sem `DATABASE_URL`.

## Hospedar API na nuvem (próximo)

- [Render](https://render.com) — Web Service + PostgreSQL
- Railway, Fly.io, VPS da prefeitura
- Build do front com `VITE_API_URL=https://sua-api...`
