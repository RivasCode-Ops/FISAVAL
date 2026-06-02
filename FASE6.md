# Fase 6 — Mapa do painel + deploy ligado

## Mapa operacional (gestor)

No **Painel**:

- Mapa com todas as OS (filtro por status e fiscal)
- Cores por status (campo, sync, homologação, etc.)
- Clique no marcador ou na tabela para destacar a OS
- Legenda abaixo do mapa

## Deploy Pages + API

Siga [DEPLOY-ONLINE.md](DEPLOY-ONLINE.md):

1. Render Blueprint → URL da API  
2. GitHub secret `VITE_API_URL`  
3. Re-run workflow Pages  

Login mostra **Modo servidor** quando o build inclui a URL da API.
