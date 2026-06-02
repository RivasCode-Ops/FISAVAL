# Fase 12 — Tenant nas listagens + laudo de homologação

## Filtro por tenant (`TENANT_ID`)

Demandas e ordens retornadas pela API respeitam o tenant da instância:

- Registros **sem** `tenantId` (legado) continuam visíveis
- Registros de **outro** tenant são ocultados
- KPIs e mapa do painel usam apenas ordens do tenant

PostgreSQL: coluna `tenant_id` em `demandas` (migração automática no boot).

## App offline

- `VITE_TENANT_ID` em `app/.env` (opcional) alinha o filtro local ao da API
- Ao conectar na API, o tenant é lido de `/api/fisaval/config` e aplicado nas listagens Dexie

## Laudo imprimível

No **Painel**, fila de homologação → **Imprimir laudo**: PDF via diálogo de impressão do navegador, com checklist, divergência e imagem da assinatura do fiscal.

## Próximo

- Roteirização na API + VROOM — ver [FASE13.md](FASE13.md)
- Banco isolado por tenant (schema ou instância dedicada)
- Assinatura ICP-Brasil / gov.br
