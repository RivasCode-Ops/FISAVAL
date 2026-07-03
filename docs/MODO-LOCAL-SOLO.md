# Modo local solo — contrato de escopo do piloto

Documento de referência para **não reintroduzir complexidade** antes do fluxo demanda → laudo PDF estar validado ([TESTE-MANUAL.md](../TESTE-MANUAL.md)).

**Ativação:** `app/.env` → `VITE_PILOTO_LOCAL=true` (padrão no `.env.example` clonado em `D:\PROJETOS`).

---

## Usa no MVP local

| Peça | Como roda | Fluxo |
|------|-----------|--------|
| App React (Vite :5192) | `npm run dev` | UI gestor + fiscal |
| API Node (:8790) | `npm run dev:api` | JWT demo, JSON em `api/data/` |
| `npm run dev:all` | concurrently | Desenvolvimento diário |
| Login demo | `gestor@demo` / `fiscal@demo` | Sem OAuth |
| IndexedDB + sync API | Com `VITE_API_URL` | Campo offline → sync na LAN |
| Leaflet + tiles OSM | Internet opcional no mapa | Única dependência externa “leve” aceita |
| Laudo PDF | `Imprimir laudo` no Painel | Pop-up + Salvar como PDF |
| Fotos | **Opcional** (roteiro sugerido: fachada + 3 ângulos), máx. 10, compressão JPEG | Campo + laudo em grade 2×2 se houver |
| GPS | Check-in real (sem fallback para coords da OS) + coords no laudo | Campo; ver GPS em [TESTE-MANUAL.md](../TESTE-MANUAL.md) |

---

## Adiar (fase 2+)

| Peça | Motivo | Doc |
|------|--------|-----|
| Docker / PostGIS | Volume 50k imóveis; piloto usa JSON | [FASE3.md](./FASE3.md) |
| Render / Railway / hospedar API | Nuvem só após piloto | [HOSPEDAR-API.md](./HOSPEDAR-API.md) |
| GitHub Pages produção | Demo pública depois do local | [DEPLOY.md](./DEPLOY.md) |
| VROOM / roteirização | Fase 13; escondido na UI piloto | [FASE13.md](./FASE13.md) |
| Geofence, janela horária, capacidade diária | Fases 14–16 | FASE14–16 |
| Multi-tenant `X-Tenant-Id` | Monetização B2G | [FASE17.md](./FASE17.md) |
| Tipos vistoria + skills VROOM | Fase 18 | [FASE18.md](./FASE18.md) |
| Web Push (VAPID) | Servidor + chaves | [FASE9.md](./FASE9.md) |
| SMTP alertas | Fase 24 | [FASE24.md](./FASE24.md) |
| Import CSV massivo | Fase 10; escondido no piloto | [FASE10.md](./FASE10.md) |
| Auditoria / Super painel | Fase 10–11; menu oculto | [FASE10.md](./FASE11.md) |
| Assinatura ICP / gov.br | Integração externa | [FASE21.md](./FASE21.md) |
| Comparativo mercado / POI entorno | Dados terceiros | [FASE2-BACKLOG.md](./FASE2-BACKLOG.md) |
| Keycloak / Azure AD | SSO por município contratado | [BENCHMARK-GITHUB.md](./BENCHMARK-GITHUB.md) |

---

## UI no modo piloto

Com `VITE_PILOTO_LOCAL=true`:

- Ocultos: **Auditoria**, **Global**, roteirização, habilitações VROOM, push, import CSV, janela de visita, CSV servidor.
- Mantidos: **Painel**, **Demandas**, **Campo**, mapa, homologação, **Imprimir laudo**.

Para reexibir tudo: `VITE_PILOTO_LOCAL=false` e reiniciar o dev server.

---

## Critério para sair do modo solo

1. [TESTE-MANUAL.md](../TESTE-MANUAL.md) 100% marcado em ambiente real (Wi-Fi, celular opcional).
2. Pelo menos **3 vistorias** com laudo PDF arquivado.
3. Decisão explícita de abrir **uma** linha de [FASE2-BACKLOG.md](./FASE2-BACKLOG.md) por vez.
