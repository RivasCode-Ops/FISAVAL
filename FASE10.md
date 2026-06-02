# Fase 10 — Auditoria + importação cadastro

## Log de auditoria

Registrado no servidor (`api/data/audit-log.json`):

- Login
- Criar demanda / gerar OS / homologar
- Importação CSV

**Gestor** → menu **Auditoria** (requer API).

## Importar imóveis / demandas (CSV)

1. Prepare planilha com coluna **bairro** (obrigatória).
2. **Demandas** → **Importar cadastro (CSV)**.
3. Funciona **offline** (IndexedDB) ou **online** (API + auditoria).

Exemplo: [docs/samples/import-demandas.csv](samples/import-demandas.csv)

## Nome do município

Em `api/.env`:

```env
MUNICIPIO_NOME=Prefeitura de Exemplo
```

Aparece abaixo do título FISAVAL na barra superior.

## Próximo

- Multi-tenant (várias prefeituras no mesmo deploy)
- Assinatura digital do fiscal na vistoria
