# Fase 22 — Alertas de prazo vencido (tenant e cross-tenant)

## Regra

OS **ativas** (`atribuida`, `em_campo`, `check_in`, etc.) com `prazo` anterior a hoje entram no alerta.

```env
ALERTA_PRAZO_MIN=1
```

Tenant aparece em alerta no painel global quando `prazoVencido >= ALERTA_PRAZO_MIN`.

## API

| Rota | Auth | Descrição |
|------|------|-----------|
| `GET /alertas/prazo-vencido` | gestor, admin | Lista OS vencidas do tenant ativo |
| `GET /super/alertas/prazo-vencido` | super-admin | Agregado por prefeitura + detalhe das OS |
| `GET /super/overview` | super-admin | Campo `emAlerta` por tenant |

`/config` expõe `alertaPrazoMin`.

## App

- **Painel**: card vermelho com tabela; clique destaca OS no mapa
- **Global**: bloco de alerta cross-tenant + linhas destacadas na tabela KPI

## Demo

Seed `demo`: OS-8821 com prazo `2025-10-20` (vencida). Demanda D-1043 também com prazo antigo (sem OS ainda).

Login `gestor@demo` → Painel mostra alerta. Login `admin@demo` + tenant qualquer → **Global** lista alertas por prefeitura.

## Próximo

- Push/e-mail automático para gestor e super-admin
- Integração ICP-Brasil / gov.br (produção)
- Seed PostgreSQL na primeira visita ao tenant
