# Fase 19 — Habilitações por fiscal (skills VROOM restritas)

## Modelo

Campo opcional `tiposHabilitados` no usuário fiscal:

- **Ausente ou vazio** → todos os tipos (skills VROOM `[1,2,3,4,5]`)
- **Lista** → apenas tipos listados (ex.: só `Denúncia` → skill `2`)

## Demo

| Fiscal | Habilitações |
|--------|----------------|
| Ana Silva (`fiscal@demo`) | Todos |
| Carlos Mendes (`carlos@demo`) | Só **Denúncia** |

Demanda `D-1043` (Denúncia) → Carlos ou Ana. Revisão cadastral → só Ana.

## API

- `POST /demandas/:id/gerar-os` — `409` se fiscal não habilitado para o tipo da demanda
- `PATCH /fiscais/:id/tipos-habilitados` — gestor/admin; body `{ "tiposHabilitados": ["Denúncia", ...] }`
- `GET /fiscais` — inclui `tiposHabilitados`
- VROOM em `POST /ordens/otimizar-rota` usa skills do fiscal, não mais sempre `[1..5]`

PostgreSQL: coluna `users.tipos_habilitados` (JSONB).

## App

- **Demandas**: fiscal padrão com rótulo de habilitações; botão Gerar OS só se houver fiscal compatível
- **Painel**: checkboxes por fiscal para editar habilitações

## Próximo

- Assinatura ICP-Brasil / gov.br
- Painel super-admin cross-tenant
- Sugestão automática de fiscal por tipo na fila
