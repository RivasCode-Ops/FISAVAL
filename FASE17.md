# Fase 17 — Multi-tenant na mesma API (`X-Tenant-Id`)

## Uma API, várias prefeituras

Com `MULTI_TENANT=true`, cada requisição pode informar o tenant:

```http
X-Tenant-Id: paulinia-sp
Authorization: Bearer …
```

Sem o header, usa `TENANT_ID` do `.env` (instância single-tenant).

## Cadastro de tenants

1. **Arquivo** `api/data/tenants-registry.json`:

```json
{
  "tenants": {
    "demo": { "municipio": "Prefeitura de Exemplo" },
    "paulinia-sp": { "municipio": "Prefeitura de Paulínia" }
  }
}
```

2. **Variável** `TENANTS` (opcional):

```env
MULTI_TENANT=true
TENANTS=demo:Prefeitura de Exemplo;paulinia-sp:Prefeitura de Paulínia
```

## Dados por tenant

- JSON: `api/data/tenants/{id}/` (criado na primeira requisição)
- Uploads: `uploads/{id}/`
- PostgreSQL: filtro `tenant_id` com o tenant ativo da requisição

## Endpoints

| Rota | Auth | Descrição |
|------|------|-----------|
| `GET /api/fisaval/tenants` | Não | Lista tenants para o login |
| `GET /api/fisaval/config` | Não* | Config do tenant do header |

\* Demais rotas exigem JWT após login no banco do tenant escolhido.

## App

- Login: seletor de prefeitura quando `multiTenant`
- `localStorage` + header `X-Tenant-Id` em todas as chamadas
- `VITE_TENANT_ID` para pré-selecionar o tenant

## Próximo

- Tipo de vistoria + skills VROOM — ver [FASE18.md](FASE18.md)
- Assinatura ICP-Brasil / gov.br
- Painel super-admin cross-tenant
