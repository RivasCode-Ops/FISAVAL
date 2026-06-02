# Fase 5 — Sync servidor + roteirização

## Sincronização real (API)

Ao tocar **Sincronizar pendentes** no Campo, com API online:

1. Envia checklist, GPS, conclusão da vistoria (`PATCH /vistorias/:id`).
2. Move a OS para **homologacao** no servidor (`PATCH /ordens/:id`).
3. Envia fotos pendentes e faz `sync/replace` do estado.

O gestor vê a fila no **Painel** com indicador de divergência.

## Roteirização (MVP)

- **Otimizar rota (GPS)** — ordena OS ativas pelo vizinho mais próximo a partir da posição atual.
- Mapa da rota com paradas numeradas e linha entre pontos.
- **Abrir no mapa** — link para navegação (Google Maps).
- Número da parada na lista de OS (`rotaOrdem`).

Próximo passo opcional: integrar [VROOM](http://github.com/VROOM-Project/vroom) ou OSRM para rotas com restrições de tempo.

## Testar

```powershell
npm run dev:all
```

1. Login `fiscal@demo` → Campo → **Otimizar rota**.
2. Concluir vistoria → **Sincronizar pendentes**.
3. Login `gestor@demo` → Painel → homologar.
