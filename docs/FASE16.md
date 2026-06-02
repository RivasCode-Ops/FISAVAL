# Fase 16 — Dados isolados por tenant + capacidade diária

## Armazenamento por tenant (JSON)

Com `TENANT_ID` e modo JSON (sem `DATABASE_URL`), cada prefeitura usa pasta própria:

```
api/data/tenants/{TENANT_ID}/
  fisaval.json
  audit-log.json
  push-subs.json
uploads/{TENANT_ID}/{vistoriaId}/...
```

- **Padrão:** isolamento ligado (`TENANT_ISOLATED` diferente de `0`/`false`)
- Na primeira subida, copia `api/data/fisaval.json` legado para a pasta do tenant
- PostgreSQL continua com filtro `tenant_id` na mesma instância

## Capacidade diária do fiscal

```env
MAX_VISITAS_DIA_FISCAL=12
```

- Conta vistorias **concluídas hoje** (`concluidaAt`)
- Bloqueia **gerar OS** (409) se o limite foi atingido
- **Otimizar rota** limita paradas ao que resta do dia; VROOM recebe `capacity` no veículo

## KPIs no painel

- **Visitas hoje** — concluídas no dia (tenant)
- **Prazo vencido** — OS ativas com prazo anterior a hoje

Config pública em `/api/fisaval/config`: `tenantIsolated`, `maxVisitasDiaFiscal`.

## Próximo

- Assinatura ICP-Brasil / gov.br
- Múltiplos tenants na mesma API (header `X-Tenant-Id`)
- Skills VROOM por tipo de vistoria
