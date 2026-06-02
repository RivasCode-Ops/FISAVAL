# Fase 18 — Tipo de vistoria e skills VROOM

## Tipo na ordem de serviço

Ao gerar OS, o campo `tipo` da demanda é copiado (ex.: Revisão cadastral, Denúncia).

| Tipo | Skill VROOM |
|------|-------------|
| Revisão cadastral | 1 |
| Denúncia | 2 |
| Recadastramento | 3 |
| Auditoria interna | 4 |
| Outros | 5 |

## Roteirização

- **VROOM**: veículo com skills `[1,2,3,4,5]`; cada job com skill do tipo
- **prazo-proximidade**: agrupa paradas do mesmo tipo antes de desempatar por prazo/GPS

Resposta de `POST /ordens/otimizar-rota` inclui `tiposRota`: sequência de tipos na rota sugerida.

## App

- **Campo**: badge do tipo na lista de OS; resumo da rota com tipos (`Denúncia → Revisão…`)
- **Painel**: filtro **Tipo** no mapa
- CSV com coluna **Tipo**

## API

`GET /api/fisaval/tipos-vistoria` — lista tipos padrão e skills (sem auth).

## Próximo

- Assinatura ICP-Brasil / gov.br
- Painel super-admin cross-tenant
- Fiscais com skills restritas (ex.: só Denúncia)
