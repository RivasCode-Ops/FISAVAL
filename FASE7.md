# Fase 7 — Operação e PostgreSQL plain

## App

| Recurso | Onde |
|---------|------|
| Status da API | Login + barra superior (pill `API`) |
| Atualizar servidor | Botão no menu (gestor/admin) |
| Painel auto-refresh | A cada 30s com API online |
| Demandas | Escolha do fiscal, GPS na demanda, formulário corrigido |

## PostgreSQL sem PostGIS

Em hospedagens sem extensão PostGIS (ex. Postgres gerenciado simples), a API:

1. Tenta `CREATE EXTENSION postgis` + `001_init.sql`
2. Se falhar, aplica `001_init_plain.sql` (só lat/lng)

Logs: `PostgreSQL: schema PostGIS` ou `schema plain`.

## Comandos

```powershell
npm run dev:all
```

Gestor: criar demanda com GPS → gerar OS → fiscal sincroniza → painel atualiza sozinho.
