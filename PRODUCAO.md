# Produção — app + API

## Rodar tudo local (recomendado)

```powershell
cd c:\_PROJETOS\E-FISCAL
npm install
copy app\.env.example app\.env
cd api && npm install && copy .env.example .env && cd ..
npm run dev:all
```

- App: http://127.0.0.1:5192  
- API: http://127.0.0.1:8790/health  
- Logins: `gestor@demo` / `fiscal@demo` — senha `demo123`  
- Com `VITE_API_URL` no `app/.env`, login retorna **JWT** e dados ficam em `api/data/fisaval.json`.

## PostGIS (fase 3)

```powershell
docker compose up -d
```

Em `api/.env` descomente:

```env
DATABASE_URL=postgres://fisaval:fisaval@localhost:5432/fisaval
JWT_SECRET=um-segredo-forte
```

Reinicie a API — storage muda para `postgres+postgis`. Detalhes: [FASE3.md](FASE3.md).

## GitHub Pages (só front, modo offline local)

https://rivascode-ops.github.io/FISAVAL/

- Ative **Settings → Pages → branch `gh-pages` → / (root)** se ainda der 404.
- Sem API hospedada, cada navegador guarda dados no IndexedDB.

## API na nuvem

Ver [HOSPEDAR-API.md](HOSPEDAR-API.md).

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run dev:all` | API + app |
| `npm run build:pages` | Build Pages em `docs/` |
| `cd api && npm run build` | Compilar TypeScript da API |
