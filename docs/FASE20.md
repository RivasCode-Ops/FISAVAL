# Fase 20 — Super-admin cross-tenant e sugestão de fiscal

## Correção multi-tenant (JSON)

`tenantDataDir()` passou a usar `getActiveTenantId()` em vez de `TENANT_ID` fixo do `.env`, isolando corretamente `api/data/tenants/{id}/`.

## Super-admin

Com `MULTI_TENANT=true` e e-mail em `SUPER_ADMIN_EMAILS` (padrão `admin@demo`):

| Rota | Descrição |
|------|-----------|
| `GET /api/fisaval/super/overview` | KPIs de todos os tenants |
| Login | Resposta inclui `superAdmin: true` |

App: menu **Global** → `/super` (tabela comparativa).

## Sugestão automática de fiscal

`GET /api/fisaval/fiscais/sugerir?tipo=Denúncia` (gestor/admin)

Critério (entre fiscais habilitados para o tipo):

1. Menor número de OS ativas  
2. Menor visitas concluídas hoje  
3. Desempate por id  

**Demandas**: ao mudar o tipo da nova demanda, o fiscal padrão é atualizado; rótulo “Sugerido: …”.

## Demo

```env
MULTI_TENANT=true
TENANTS=demo:Prefeitura;paulinia-sp:Paulínia
SUPER_ADMIN_EMAILS=admin@demo
```

Login `admin@demo` / `demo123` → aba **Global**.

## Próximo

- Seed Paulínia e assinatura ICP/gov.br — ver [FASE21.md](FASE21.md)
- Alertas cross-tenant (prazo vencido agregado)
