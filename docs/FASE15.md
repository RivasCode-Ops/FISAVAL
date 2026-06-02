# Fase 15 — Janela horária de visita

## Campos na OS

`visitaInicio` e `visitaFim` no formato **HH:mm** (horário local).

- Definidos ao **gerar OS** (Demandas → campos de hora opcionais)
- Editáveis via `PATCH /ordens/:id` com `{ visitaInicio, visitaFim }` ou `{ status }`

## Roteirização

- **prazo-proximidade**: OS fora da janela atual recebem penalidade na ordenação (visitam depois)
- **VROOM**: envia `time_windows` nos jobs quando a janela está preenchida

## App

- **Campo**: badge `08:00–12:00` · **agora** quando dentro da janela
- **Demandas**: inputs `time` ao lado do fiscal padrão
- CSV com colunas Visita início / Visita fim

## Validação API

- Formato `HH:mm` (00:00–23:59)
- Início e fim devem ser informados juntos

## Próximo

- Banco isolado por tenant
- Assinatura ICP-Brasil
- Capacidade diária do fiscal no VROOM (skills)
