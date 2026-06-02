# Fase 13 — Roteirização na API + VROOM opcional

## Endpoint

`POST /api/fisaval/ordens/otimizar-rota` (JWT)

```json
{ "fiscalId": "u-fiscal1", "startLat": -23.55, "startLng": -46.633 }
```

- **Fiscal**: só pode otimizar a própria rota (`fiscalId` omitido = usuário logado).
- **Gestor/admin**: qualquer fiscal.

Resposta:

```json
{
  "ordens": [...],
  "paradas": 4,
  "distanciaKm": 12.3,
  "duracaoMinEst": 21,
  "engine": "proximidade"
}
```

`engine` = `vroom` quando `VROOM_URL` está configurado e o serviço responde; senão **vizinho mais próximo** (mesmo algoritmo offline).

## VROOM (produção)

```env
VROOM_URL=http://127.0.0.1:3000
```

Stack de teste: [docker-ors-vroom](https://github.com/stefanocudini/docker-ors-vroom). Sem VROOM, o sistema continua funcionando.

## App

- **Campo** → Otimizar rota (GPS): chama API quando online; exibe ~km, ~min e número da parada na lista.
- **Painel** → **Otimizar rota do fiscal** (gestor): define ordem das OS ativas no servidor.

Auditoria: evento `rota.otimizar`.

## Próximo

- Restrições de janela de tempo / capacidade por fiscal
- Banco isolado por tenant
- Assinatura ICP-Brasil
