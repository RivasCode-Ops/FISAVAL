# Fase 21 — Seed por tenant, assinatura ICP/gov.br (stub)

## Provisionamento automático (JSON)

Na primeira requisição a um tenant (`ensureTenantReady`), se `fisaval.json` estiver vazio:

| Tenant | Conteúdo |
|--------|----------|
| `demo` | Seed histórico (gestor/fiscal@demo, D-1042, OS-8821) |
| `paulinia-sp` | Gestor/fiscal `@paulinia.sp.gov.br`, demandas em Paulínia (GPS ~-22.76, -47.15) |
| Outros | Gestor/fiscal `@{slug}.local` + 1 demanda genérica |

Arquivo opcional: `api/data/tenants-registry.json` com metadados dos tenants.

## Assinatura certificada (demo)

Variáveis:

```env
ASSINATURA_MODOS=canvas,icp,govbr
ASSINATURA_PADRAO=canvas
```

| Modo | Comportamento |
|------|----------------|
| `canvas` | PNG no pad (fases anteriores) |
| `icp` | Stub — `POST …/assinatura/certificada` grava `assinaturaModo` + `assinaturaRef` |
| `govbr` | Idem, simula gov.br Sign |

`GET /api/fisaval/config` expõe `assinaturaModos` e `assinaturaPadrao`.

**Campo**: abas Desenho / ICP-Brasil / gov.br. Concluir vistoria exige assinatura válida (arquivo ou ref certificada).

**Homologação / laudo**: exibe referência certificada em vez de imagem quando aplicável.

PostgreSQL: colunas `assinatura_modo`, `assinatura_ref` em `vistorias`.

## Demo Paulínia

1. `MULTI_TENANT=true` + registry com `paulinia-sp`
2. Login → tenant **Paulínia** → `gestor@paulinia.sp.gov.br` / `demo123`
3. Global (admin@demo) lista KPIs de demo e paulinia-sp

## Próximo

- Integração real ICP-Brasil (API do provedor) e gov.br OAuth
- Alertas cross-tenant (e-mail/push quando prazo vencido > limiar)
- Seed PostgreSQL por tenant na primeira visita
