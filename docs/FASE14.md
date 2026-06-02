# Fase 14 — Prazo na OS, rota por urgência e geofence

## Prazo e prioridade na ordem de serviço

Ao **gerar OS**, `prioridade` e `prazo` da demanda são copiados para a ordem.

- **Campo**: badges de prioridade, prazo (vermelho se vencido) e parada `#N`
- **CSV**: colunas Prioridade e Prazo nas exportações de OS

## Roteirização por urgência

Sem VROOM, o motor padrão passou a ser **`prazo-proximidade`**: vizinho mais próximo, priorizando OS com prazo mais curto e prioridade alta entre paradas próximas.

Com `VROOM_URL`, continua tentando VROOM primeiro.

## Geofence no check-in

`CHECKIN_RADIUS_M` (padrão **200** m) em `api/.env`.

- Exposto em `/api/fisaval/config`
- **Campo** → Check-in: se o GPS estiver além do raio, pede confirmação antes de registrar
- `0` desliga a validação

## Capacidade por fiscal

`MAX_OS_ATIVAS_FISCAL` (padrão **0** = ilimitado).

Ao gerar OS, retorna **409** se o fiscal já atingiu o limite de OS ativas.

## Próximo

- Janela horária de visita — ver [FASE15.md](FASE15.md)
- Banco isolado por tenant
- Assinatura ICP-Brasil
