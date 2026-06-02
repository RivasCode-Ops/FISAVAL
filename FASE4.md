# Fase 4 — Fotos offline + deploy API

## Fotos no aparelho (PWA)

- Fotos ficam no **IndexedDB** (`fotos` no Dexie v2).
- Funciona **sem API** (só local) ou **offline** com API configurada.
- Botão **Sincronizar pendentes** envia fotos `local` → servidor quando online.

## Deploy API no Render

1. Conta em [render.com](https://render.com) → **New Blueprint** → repo `RivasCode-Ops/FISAVAL`.
2. O arquivo [render.yaml](../render.yaml) cria API + PostgreSQL.
3. Após deploy, copie a URL (ex. `https://fisaval-api.onrender.com`).
4. GitHub → Settings → Secrets → `VITE_API_URL` = URL da API (sem barra final).
5. O workflow Pages já usa o secret no build (se definido).

### Variáveis importantes

| Variável | Exemplo |
|----------|---------|
| `JWT_SECRET` | gerado pelo Render |
| `DATABASE_URL` | ligado ao Postgres do blueprint |
| `CORS_ORIGIN` | `https://rivascode-ops.github.io` |

O blueprint usa **banco JSON** (sem `DATABASE_URL`). Para PostGIS persistente, use VPS + `docker compose` ([FASE3.md](FASE3.md)).

## Testar fotos offline

1. `npm run dev:all` com `app/.env` apontando para API.
2. Campo → tirar foto → desligar rede → foto continua visível.
3. Religar rede → **Sincronizar pendentes**.
