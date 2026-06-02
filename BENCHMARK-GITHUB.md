# Benchmark GitHub — E-FISCAL

Pesquisa em jun/2026 (API GitHub pública + revisão manual). Objetivo: achar projetos com finalidade parecida ou **partes reutilizáveis**, adaptadas à realidade do E-FISCAL (fiscalização de campo, cadastro imobiliário municipal, PWA offline, PostGIS, prefeitura pequena/média).

---

## Conclusão executiva

| Achado | Implicação para vocês |
|--------|------------------------|
| **Não existe** no GitHub um produto open source maduro, em português, com o pacote completo “demanda → OS → vistoria de campo → painel → integração tributária” para prefeitura BR | O E-FISCAL continua sendo **produto próprio**; o GitHub serve de **biblioteca de padrões e módulos**, não de fork pronto |
| O que mais se aproxima da **stack** é [gratis-gis](https://github.com/palavido-dev/gratis-gis) (Next + PostGIS + MapLibre + campo offline) | Referência arquitetural forte; licença **AGPL-3.0** exige cuidado se integrar código |
| O que mais se aproxima do **negócio cadastral** é catastro/LADM e APIs de cadastro urbano | Modelo de dados e processos, não app de fiscal de campo |
| O ativo **mais valioso interno** é o [GeoGrowth](https://github.com/RivasCode-Ops/geogrowth) + `geogrowth-sync-api` | PWA, visitas, mapa, fila offline/sync — adaptar domínio “território comercial” → “imóvel + vistoria fiscal” |

---

## Mapa de aderência ao E-FISCAL

Legenda: **Alta** = reaproveitar conceito/código com pouca adaptação · **Média** = padrão ou módulo pontual · **Baixa** = só inspiração ou legado pesado

| Repositório | Foco | Aderência | O que pegar |
|-------------|------|-----------|-------------|
| [RivasCode-Ops/geogrowth](https://github.com/RivasCode-Ops/geogrowth) | PWA offline, visitas, mapa, sync | **Alta** (interno) | IndexedDB/Dexie, fila de sync, feature `visits`, território/mapa, deploy Pages |
| [palavido-dev/gratis-gis](https://github.com/palavido-dev/gratis-gis) | Portal GIS self-hosted, formulários, campo offline | **Alta** (stack) | PostGIS + MapLibre + Nest/Next + Keycloak + MinIO; field PWA; **AGPL** |
| [Rural-Environmental-Registry/core](https://github.com/Rural-Environmental-Registry/core) | Cadastro rural CAR, imóvel + pessoa + mapa | **Média** | Modelo imóvel/atributos, `map_component` Leaflet, Docker, Keycloak; stack Java/Vue |
| [willianforgiarini/django-cadastro](https://github.com/willianforgiarini/django-cadastro) | API cadastro urbano municipal | **Média** | Entidades: bairro, logradouro, lote, edificação, quadra, setor, zoneamento |
| [spuhub/prisma](https://github.com/spuhub/prisma) | Plugin QGIS — sobreposição de imóveis | **Média** (back-office) | Validação cadastral/espacial na TI; não substitui PWA de campo |
| [GalileoIyS/CATASTRO-MULTIPAIS-OPEN-SOURCE](https://github.com/GalileoIyS/CATASTRO-MULTIPAIS-OPEN-SOURCE) | Gestão catastral multipaís | **Baixa** | Processos de mutação cadastral e tributo predial; stack VB.NET / ASP.NET antigo |
| [BIDValoraSoloUrbano/BID-Valoriza_Solo_Urbano](https://github.com/BIDValoraSoloUrbano/BID-Valoriza_Solo_Urbano) | Valorização de solo (BID) | **Baixa** | Plugin QGIS + modelo espacial; útil se módulo “obra pública / valorização” no futuro |
| [OpenGeoOne/GeoUrbano](https://github.com/OpenGeoOne/GeoUrbano) | Estrutura cadastral REURB/loteamento | **Baixa** | Scripts SQL/GeoPackage para malha de lotes |
| [getodk/collect](https://github.com/getodk/collect) + [enketo/enketo-express](https://github.com/enketo/enketo-express) | Formulários XForms offline | **Média** (checklist) | Padrão de checklist versionável; PWA web via Enketo ou inspirar fila de submissão |
| [smap-consulting/fieldTask5](https://github.com/smap-consulting/fieldTask5) | ODK + tarefas + geofence | **Média** | Agendamento/geofencing para roteiro de fiscal |
| [VROOM-Project/vroom](https://github.com/VROOM-Project/vroom) | Otimização de rotas (VRP) | **Média** | Microserviço para **roteirizador de fiscais** (Plano Produção) |
| [pgRouting/vrprouting](https://github.com/pgRouting/vrprouting) | VRP no PostgreSQL | **Média** | Alternativa se quiser rotas coladas no PostGIS |
| [markaspot/mark-a-spot](https://github.com/markaspot/mark-a-spot) | Open311 + Drupal + Vue PWA | **Média** | Fluxo cidadão/demanda → ticket → resolução (paralelo a **demanda/OS**) |
| [City-of-Bloomington/uReport](https://github.com/City-of-Bloomington/uReport) | Open311 + CRM cidadão | **Média** | SLA, status, georreferência de ocorrências |
| [MohammedBelfellah/mini-project](https://github.com/MohammedBelfellah/mini-project) (SIPU) | Patrimônio urbano + inspeções | **Média** | MCD com inspeções/zonas; Flask + PostGIS + Leaflet |
| [Mcp-Brasil/mcp-brasil](https://github.com/Mcp-Brasil/mcp-brasil) | APIs dados públicos BR | **Baixa** (adjunto) | Enriquecimento: SICONFI, transparência, SPU — não é app de vistoria |
| Busca `fiscalizacao+municipal` | — | **Nenhuma** relevante | Só transparência legislativa, trânsito BH, licitação fictícia |

---

## Por camada do E-FISCAL (adaptação prática)

### 1. Cadastro imobiliário + geometria (até 50 mil imóveis)

**Referências de modelo de dados**

- [django-cadastro](https://github.com/willianforgiarini/django-cadastro) — vocabulário municipal brasileiro (lote, quadra, setor, edificação).
- Metodologia **CIATA / BCI** (não é um repo único; ferramentas QGIS na [GeoOne](https://geoone.com.br/automatizacao-do-numero-de-inscricao-imobiliaria-no-qgis/)) — inscrição imobiliária GIC/GINC.
- [RER/backend](https://github.com/Rural-Environmental-Registry/backend) — imóvel + pessoa + atributos + PostGIS.

**Adaptação**

- Definir schema PostGIS alinhado ao que a prefeitura **já tem** (mesmo que import inicial seja shapefile/GeoPackage).
- Não importar CATASTRO Galileo (legado .NET); usar só como checklist de **processos** (mutação, contribuinte, parcela).

**Ferramentas back-office (TI da prefeitura)**

- [spuhub/prisma](https://github.com/spuhub/prisma) — conferência de sobreposição e relatórios em QGIS para equipe de cadastro, enquanto fiscais usam PWA.

---

### 2. PWA de campo (vistoria offline + fotos)

**Opção A — recomendada para vocês: evoluir padrão GeoGrowth**

Já em produção no ecossistema:

- React + Vite + Dexie + Workbox
- Módulo de visitas e sync HTTP (`geogrowth-sync-api`)
- Mapa Leaflet/OSM

**Mapeamento de domínio**

| GeoGrowth hoje | E-FISCAL |
|----------------|----------|
| Visita | Vistoria |
| Empresa / loja | Imóvel (inscrição + endereço) |
| Território | Setor fiscal / bairro |
| Checklist implícito em formulário | Checklist parametrizável por tipo de OS |

**Opção B — ODK/Enketo para checklist pesado**

- Prós: formulários complexos, padrão internacional, offline maduro.
- Contras: UX separada (app Android ou Enketo), integração com OS/demanda e fotos no mesmo fluxo exige ponte.
- Uso adaptativo: **piloto** com XLSForm para um tipo de vistoria; core do produto continua PWA única.

**Opção C — gratis-gis field PWA**

- Estudar implementação offline e form builder.
- Só fork/integração se aceitarem **AGPL** e dependência de monorepo grande (pre-v1).

---

### 3. Demanda, OS, painel gestor

Não há clone perfeito; padrão mais próximo: **Open311** (demanda georreferenciada com estados).

- [markaspot/mark-a-spot](https://github.com/markaspot/mark-a-spot) — PWA + backend (pesado: Drupal).
- [BhavyaSoni21/SmartCities_Insights](https://github.com/BhavyaSoni21/SmartCities_Insights) — Django, SLA, papéis admin/cidadão (pequeno, mas legível).

**Adaptação**

- Implementar estados próprios: `demanda → OS atribuída → em campo → concluída / pendente sync → auditada`.
- Reaproveitar **ideias** de SLA e filas, não o código Drupal.

---

### 4. Roteirização de fiscais (Plano Produção)

- [VROOM-Project/vroom](https://github.com/VROOM-Project/vroom) — serviço HTTP de VRP; entrada: matriz de tempos + lista de OS; saída: ordem por fiscal.
- [stefanocudini/docker-ors-vroom](https://github.com/stefanocudini/docker-ors-vroom) — stack Docker ORS + VROOM para teste.
- [pgRouting/vrprouting](https://github.com/pgRouting/vrprouting) — se quiser manter tudo no PostgreSQL.

**Adaptação**

- MVP: ordenação simples por proximidade (PostGIS `ST_Distance`) sem VROOM.
- Produção: VROOM como job após o gestor fechar a rota do dia.

---

### 5. Mapas e performance (50k imóveis)

- [CrunchyData/pg_tileserv](https://github.com/CrunchyData/pg_tileserv) — tiles vetoriais direto do PostGIS (usado também no gratis-gis).
- [Rural-Environmental-Registry/map_component](https://github.com/Rural-Environmental-Registry/map_component) — componente Leaflet reutilizável (GPL).
- MapLibre + OSM (já na copy) — migrar de Leaflet se precisar de vector tiles em escala.

---

### 6. Auth, auditoria, integração

- Keycloak: padrão em RER e gratis-gis; no E-FISCAL a copy fala **JWT + RBAC** — Keycloak é opcional em produção grande.
- Auditoria: implementar trilha própria (tabela `audit_log`); não depender de repo genérico.
- Integração tributária/cadastro legado: **sempre custom** por município; [Mcp-Brasil](https://github.com/Mcp-Brasil/mcp-brasil) só para **dados abertos** auxiliares, não para IPTU interno.

---

## Estratégia recomendada (3 fases)

### Fase 1 — Piloto (Plano Local)

| Prioridade | Ação |
|------------|------|
| 1 | Fork conceitual do **GeoGrowth** → módulos `imovel`, `vistoria`, `ordem_servico` |
| 2 | Schema PostGIS inspirado em **django-cadastro** + campos da prefeitura piloto |
| 3 | PWA: checklist fixo + fotos + GPS; sync igual GeoGrowth |
| 4 | Painel mínimo: lista de OS por fiscal, sem VROOM |

### Fase 2 — Produção municipal

| Prioridade | Ação |
|------------|------|
| 1 | pg_tileserv ou MVT para mapa com 50k polígonos |
| 2 | VROOM ou pgRouting para roteiro diário |
| 3 | RBAC completo + audit log detalhado |
| 4 | QGIS + **prisma** para equipe de cadastro validar geometrias |

### Fase 3 — Integrações

| Prioridade | Ação |
|------------|------|
| 1 | API de exportação/importação com sistema tributário (contrato por cliente) |
| 2 | Opcional: Enketo/ODK só para formulários “especiais” (vistoria ambiental, etc.) |

---

## O que **não** vale a pena

| Repo / caminho | Motivo |
|----------------|--------|
| Fork integral **CATASTRO-MULTIPAIS** | VB.NET / ASP.NET Core 2, sem PWA de campo, licença obscura |
| Esperar repo “fiscalização imobiliária BR” aparecer | Busca retorna zero produto maduro |
| ODK Collect como app principal | Fiscal usa celular municipal; manter **um** PWA reduz treinamento e suporte |
| Copiar Drupal do mark-a-spot | Complexidade desproporcional ao piloto enxuto |

---

## Licenças (atenção comercial)

| Projeto | Licença | Risco ao produto fechado/SaaS |
|---------|---------|-------------------------------|
| GeoGrowth (seu) | Definir no repo | Controle total |
| gratis-gis | AGPL-3.0 | Código integrado pode exigir abrir derivados |
| RER / map_component | GPL-3.0 | Mesmo cuidado se copiar componentes |
| VROOM | BSD | Uso livre como serviço |
| ODK | Apache 2.0 | Formato XForms ok; app Android separada |
| django-cadastro | Sem licença declarada | Só inspirar modelo, não copiar código sem licença |

---

## Pesquisa técnica — limitações

- `gh` local não autenticado; buscas via API anônima bateram **rate limit** em parte das queries.
- Para varredura contínua: `gh auth login` e repetir buscas: `cadastro imobiliario postgis`, `inspection management postgis`, `field service management pwa`.

---

## Links rápidos (curadoria)

**Brasil / cadastro**

- https://github.com/willianforgiarini/django-cadastro  
- https://github.com/spuhub/prisma  
- https://github.com/OpenGeoOne/GeoUrbano  
- https://github.com/BIDValoraSoloUrbano/BID-Valoriza_Solo_Urbano  

**Stack alinhada**

- https://github.com/palavido-dev/gratis-gis  
- https://github.com/Rural-Environmental-Registry/core  

**Campo / formulários**

- https://github.com/getodk/collect  
- https://github.com/enketo/enketo-express  
- https://github.com/RivasCode-Ops/geogrowth  

**Demanda / rota**

- https://github.com/markaspot/mark-a-spot  
- https://github.com/VROOM-Project/vroom  

**Dados públicos (adjunto)**

- https://github.com/Mcp-Brasil/mcp-brasil  

---

*Documento gerado para orientar arquitetura do E-FISCAL; revisar licenças antes de qualquer copy-paste de código.*
