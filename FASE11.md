# Fase 11 — Assinatura do fiscal + tenant

## Assinatura na vistoria

- **Campo** → painel de assinatura (desenhar com dedo/mouse)
- Obrigatória antes de **Concluir vistoria**
- Armazenada no aparelho (IndexedDB) e no servidor (`uploads/{vistoriaId}/assinatura.png`)
- **Painel / homologação** exibe a assinatura e o nome do fiscal

## Sincronização

Incluída em **Sincronizar pendentes** (junto com fotos e vistoria).

## Tenant (prefeitura)

Variável `TENANT_ID` em `api/.env` — identificador da instância (ex. `paulinia-sp`).

- Aparece na barra ao lado do nome do município
- Novas demandas recebem `tenantId` automaticamente
- Auditoria registra o tenant nos eventos

```env
TENANT_ID=demo
MUNICIPIO_NOME=Prefeitura de Exemplo
```

## Próximo

- Filtro por tenant nas listagens — ver [FASE12.md](FASE12.md)
- Multi-tenant com banco isolado por `TENANT_ID`
- Certificado ICP-Brasil / assinatura gov.br
