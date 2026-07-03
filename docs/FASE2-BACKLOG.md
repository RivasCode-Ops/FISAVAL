# Fase 2 — backlog de conexões (após piloto local)

Abrir **uma integração por vez**, com feature flag ou variável em `.env`. Só iniciar item N+1 quando o piloto ([TESTE-MANUAL.md](../TESTE-MANUAL.md)) estiver verde.

---

## Ordem sugerida

| # | Item | Entrega | Dependências externas |
|---|------|---------|------------------------|
| 1 | **Backup / export JSON** | Exportar/importar banco demo entre PCs | Nenhuma (arquivo local) |
| 2 | **API hospedada** | Render/Railway/VPS; `VITE_API_URL` remoto | HTTPS, Postgres opcional |
| 3 | **PostGIS** | `docker compose up -d`; migrar de JSON | Docker, Postgres |
| 4 | **Comparativo manual** | Tabela “imóveis referência” no banco; laudo cita valores | Cadastro interno (sem scraping) |
| 5 | **Entorno (valorização)** | Camada escolas/comércio: cadastro manual ou Overpass OSM | Overpass opcional |
| 6 | **Auth municipal** | Keycloak ou Azure AD por tenant | IdP do cliente |
| 7 | **Roteirização VROOM** | Botão “Otimizar rota” com serviço VROOM | Container VROOM ou OSRM |

---

## Itens já no código (reativar via `VITE_PILOTO_LOCAL=false`)

- Import CSV de demandas — [FASE10.md](./FASE10.md)
- Auditoria e super-admin — [FASE10.md](./FASE10.md), [FASE11.md](./FASE11.md)
- Push VAPID — [FASE9.md](./FASE9.md)
- SMTP prazo vencido — [FASE24.md](./FASE24.md)
- Roteirização gestor/campo — [FASE13.md](./FASE13.md)

---

## Critério de pronto por item

| Item | Pronto quando |
|------|----------------|
| Backup JSON | Restaurar piloto em outro PC em &lt; 15 min |
| API hospedada | 2 dispositivos sincronizam mesma OS |
| PostGIS | Importar shapefile piloto sem perder fluxo PDF |
| Comparativo | Laudo mostra 3 referências digitadas pelo gestor |
| Entorno | Mapa ou lista de POIs sem bloquear laudo |
| SSO | Login AD do município + roles gestor/fiscal |
| VROOM | Rota diária com ≥ 5 OS e ordem persistida |

---

## Não fazer na fase 2 sem contrato

- Scraping ZAP/VivaReal para comparativo automático
- Fork AGPL (gratis-gis) sem revisão jurídica
- Multi-tenant completo antes de primeiro cliente pagante

Ver monetização: [PRECOS.md](./PRECOS.md) e [COPY-PROPOSTA.md](./COPY-PROPOSTA.md).
