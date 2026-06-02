# FISAVAL (E-FISCAL)

Sistema de fiscalização de campo para secretarias de finanças e cadastro imobiliário — demanda, ordens de serviço, vistorias (PWA offline), roteirização e painéis de gestão.

**Repositório:** [github.com/RivasCode-Ops/FISAVAL](https://github.com/RivasCode-Ops/FISAVAL)

## App funcionando (PWA + offline)

| Comando | O que faz |
|---------|-----------|
| `cd app && npm install && npm run dev` | App local em http://127.0.0.1:5192 |
| `npm run build:pages` (na raiz) | Gera `app/dist` e copia para `docs/` (Pages) |

**Logins demo:** `gestor@demo` / `fiscal@demo` — senha `demo123`

Módulos: **Demandas + OS**, **Campo** (mapa, GPS, checklist, sync), **Painel** (KPIs, homologação).

### API compartilhada (fase 2)

```powershell
cd c:\_PROJETOS\E-FISCAL
npm install
npm run dev:all
```

Copie `app/.env.example` → `app/.env` (`VITE_API_URL=http://127.0.0.1:8790`). Detalhes: [docs/PRODUCAO.md](docs/PRODUCAO.md) · PostGIS/JWT/fotos: [docs/FASE3.md](docs/FASE3.md) · Fotos offline + Render: [docs/FASE4.md](docs/FASE4.md) · Rota + sync API: [docs/FASE5.md](docs/FASE5.md) · Mapa painel + deploy: [docs/FASE6.md](docs/FASE6.md) · API health + PG plain: [docs/FASE7.md](docs/FASE7.md) · CSV e relatório PDF: [docs/FASE8.md](docs/FASE8.md) · Export API + push: [docs/FASE9.md](docs/FASE9.md) · Auditoria + import CSV: [docs/FASE10.md](docs/FASE10.md) · Assinatura + tenant: [docs/FASE11.md](docs/FASE11.md) · API na nuvem: [docs/HOSPEDAR-API.md](docs/HOSPEDAR-API.md)

Publicar front: [docs/DEPLOY.md](docs/DEPLOY.md) — **https://rivascode-ops.github.io/FISAVAL/**

**Demo online com API (Render + secret):** [docs/DEPLOY-ONLINE.md](docs/DEPLOY-ONLINE.md)

Se o link der 404: **Settings → Pages → branch `gh-pages` → / (root)** — ver [DEPLOY.md](docs/DEPLOY.md).

---

## Documentação comercial

| Documento | Uso |
|-----------|-----|
| [docs/COPY-PROPOSTA.md](docs/COPY-PROPOSTA.md) | Texto completo para proposta, landing e apresentações (capacidade, stack, perfis, planos) |
| [docs/BENCHMARK-GITHUB.md](docs/BENCHMARK-GITHUB.md) | Pesquisa GitHub: projetos parecidos, peças reutilizáveis e estratégia adaptativa |
| [docs/PRECOS.md](docs/PRECOS.md) | Tabela de preços (setup + mensalidade) — preencher quando definir valores |

## Resumo para proposta (colar direto)

**Capacidade, ferramentas e planos de implantação**

O sistema foi dimensionado para atender até **50 mil imóveis** e cerca de **20 mil vistorias por ano**, com consumo típico de **~3 a 6 GB/ano** em banco e fotos (crescendo com o histórico), rodando confortavelmente em servidor com **4 a 8 GB de RAM** em produção. Utiliza stack moderno (Next.js, Node/Python, PostgreSQL/PostGIS, PWA offline) e pode ser oferecido em dois formatos:

- **Plano Local / Desenvolvimento** — piloto e homologação com infraestrutura enxuta.
- **Plano Produção / Operação** — infraestrutura dedicada, todos os módulos e integrações para operação plena da prefeitura.

Detalhes técnicos, referências e copy estendida: [docs/COPY-PROPOSTA.md](docs/COPY-PROPOSTA.md).
