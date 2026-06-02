# Capacidade, ferramentas e planos de implantação

Texto comercial pronto para colar em proposta, landing ou apresentação. Ajuste nomes de município/cliente e valores em [PRECOS.md](./PRECOS.md) quando definidos.

---

## Bloco resumido (hero / one-pager)

> **Capacidade, ferramentas e planos de implantação**
>
> O sistema foi dimensionado para atender até **50 mil imóveis** e cerca de **20 mil vistorias por ano**, com consumo típico de **~3 a 6 GB/ano** em banco e fotos (primeiro ano de operação plena, variando com volume de imagens), rodando confortavelmente em servidor com **4 a 8 GB de RAM** em produção. Utiliza stack moderno (Next.js, Node/Python, PostgreSQL/PostGIS, PWA offline) e pode ser oferecido em dois formatos:
>
> - **Plano Local / Desenvolvimento** — foco em piloto e homologação com infraestrutura enxuta.
> - **Plano Produção / Operação** — infraestrutura dedicada, todos os módulos e integrações para operação plena da prefeitura.

---

## Estimativa de capacidade e recursos

Para um município de porte pequeno/médio, com até **50 mil imóveis** cadastrados e histórico de vistorias, o sistema foi pensado para rodar confortável em infraestrutura modesta, com margem para crescer.

### Base de dados (produção cliente)

| Componente | Estimativa |
|------------|------------|
| Imóveis + cadastro (atributos e geometria) | ~200–400 MB |
| Vistorias (texto/checklist) | ~200 MB/ano para ~20 mil vistorias |
| Fotos | 2–5 GB/ano (3–8 fotos por vistoria) |
| Logs/auditoria | 100–300 MB/ano conforme nível de detalhamento |

### Memória RAM (app server + banco)

| Perfil | RAM recomendada |
|--------|-----------------|
| MVP / ambiente local | 2–4 GB |
| Produção prefeitura | 4–8 GB (folga para cache, conexões, relatórios) |

Esses números são **estimativos** para dar noção de porte em projeto de software. A operação recomendada é trabalhar com margens, monitorar consumo real após o início de uso e refinar a infra com métricas — não apenas dimensionamento estático.

**Referências (dimensionamento e GIS):**

- [IBM — Estimating resources required by a new program](https://www.ibm.com/docs/pt-br/aix/7.3.0?topic=estimation-estimating-resources-required-by-new-program)
- [UEM — Espaço Acadêmico (estimativas em projetos de software)](https://periodicos.uem.br/ojs/index.php/EspacoAcademico/article/download/23850/12975/)
- [UFU — Revista Brasileira de Cartografia (PostGIS / dados geográficos)](https://seer.ufu.br/index.php/revistabrasileiracartografia/article/download/44740/23754/0)

---

## Ferramentas e operadores

### Stack sugerido (tecnologia)

| Camada | Tecnologia |
|--------|------------|
| Frontend web / PWA de campo | React / Next.js |
| Backend API | Node.js ou Python (REST/GraphQL) |
| Banco de dados | PostgreSQL + PostGIS |
| Autenticação e acesso | JWT + RBAC (fiscal, gestor, administrador) |
| Arquivos | Bucket S3-compatível ou storage do provedor |
| Mapas | MapLibre / Leaflet + tiles OpenStreetMap |
| Logs / monitoramento | Prometheus + Grafana ou equivalente gerenciado |

**Por que isso importa na venda:** stack moderno, sem dependência de licenças proprietárias caras; a prefeitura pode operar com a própria TI ou com suporte do fornecedor.

**Referências:**

- [Microsoft — Progressive Web Apps](https://learn.microsoft.com/pt-br/microsoft-edge/progressive-web-apps/how-to/)
- [MDN — Progressive Web Apps](https://developer.mozilla.org/pt-BR/docs/Web/Progressive_web_apps)

### Operadores (pessoas) esperados

| Perfil | Papel |
|--------|-------|
| **Fiscais de campo** | PWA no celular — executar vistorias |
| **Gestores** (finanças/cadastro) | Demanda, roteirização, indicadores |
| **TI da prefeitura** (ou suporte do fornecedor) | Servidor, backups, atualizações, segurança |

---

## Plano 1 — Ambiente local (desenvolvimento / piloto)

Focado em **desenvolvimento, testes e demonstrações**.

### Infra

- Deploy em servidor local ou VPS pequeno (ex.: **2 vCPU**, **4 GB RAM**, **80 GB SSD**).
- Banco e app no mesmo nó; backups simplificados.

### Recursos

- 1 base de dados (homologação / piloto).
- **3–10 usuários** (time interno + fiscais de teste).
- Limite sugerido: até **5 mil vistorias** armazenadas.

### Ferramentas ativas

- Módulo de demanda, OS, vistoria de campo e painel básico.
- PWA de campo com modo offline e sincronização manual/automática.

### Operação

- Ideal para piloto em 1–2 bairros ou setores fiscais.
- Granularidade de log menor (evita inflar storage).

### Copy de venda

> **Plano Local / Desenvolvimento**
>
> Ambiente completo para desenvolvimento, homologação e piloto controlado, com custo enxuto de infraestrutura e foco em validação das rotinas de campo antes da implantação oficial.

---

## Plano 2 — Ambiente normal / produção cliente

Focado em **operação oficial da prefeitura**.

### Infra

- Servidor dedicado ou cloud (**4–8 vCPU**, **8–16 GB RAM**, **200+ GB SSD** escalável).
- Banco em instância separada ou gerenciada (resiliência e desempenho).
- Backups diários; retenção **30–90 dias**.

### Recursos

- Dezenas de fiscais simultâneos.
- Histórico de anos de vistorias, fotos e auditoria.
- Escalável para **50–100 mil imóveis** sem reestruturação de arquitetura.

### Ferramentas ativas

- Todos os módulos: demanda, roteirizador, campo, painel avançado, indicadores, exportação de relatórios.
- Trilhas de auditoria, perfis de usuário, parametrização por secretaria/setor.

### Operação

- Integração com cadastro imobiliário e sistema tributário (quando disponível).
- Segurança, auditoria e governança de dados alinhadas à TI do município.

### Copy de venda

> **Plano Produção / Operação Cliente**
>
> Ambiente robusto, pronto para operação contínua da prefeitura, com todos os módulos habilitados, escalabilidade para a base completa de imóveis, histórico de vistorias e integração com os sistemas da Secretaria de Finanças.

---

## Comparativo rápido (tabela para proposta)

| | Plano Local / Desenvolvimento | Plano Produção / Operação |
|---|------------------------------|---------------------------|
| **Objetivo** | Piloto, homologação, demo | Operação oficial contínua |
| **Infra típica** | 2 vCPU, 4 GB RAM, 80 GB SSD | 4–8 vCPU, 8–16 GB RAM, 200+ GB SSD |
| **Usuários** | 3–10 | Dezenas de fiscais simultâneos |
| **Vistorias (referência)** | Até ~5 mil | Anos de histórico, ~20 mil/ano |
| **Módulos** | Demanda, OS, campo, painel básico | Suite completa + integrações |
| **Banco** | Mesmo nó do app | Instância separada / gerenciada |
| **Backups** | Simplificados | Diários, retenção 30–90 dias |

---

## Próximo passo: precificação

Quando definir **setup (R$)** e **mensalidade de manutenção (R$)** por plano, preencha [PRECOS.md](./PRECOS.md) e incorpore a tabela na mesma proposta/landing.
