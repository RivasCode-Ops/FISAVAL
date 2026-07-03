# Teste manual — piloto local (1 página)



**Objetivo:** validar o fluxo **demanda → OS → vistoria (foto + GPS) → homologação → laudo PDF** sem Docker, VROOM, push ou SSO.



**Pré-requisito:** `INICIAR-FISAVAL.bat` ou `npm run dev:all` em `D:\PROJETOS\02_APPS\fisaval`.



| URL | Uso |

|-----|-----|

| http://127.0.0.1:5192 | App (coordenador, agente de campo, administrador) |

| http://127.0.0.1:8790/health | API (deve retornar ok) |



**Logins demo** (senha `demo123` em todos):

| E-mail | Papel (UI) | Menu |
|--------|------------|------|
| `gestor@demo` | Coordenador | Painel, Demandas |
| `fiscal@demo` | Agente de campo | Campo |
| `admin@demo` | Administrador | Painel, Demandas, Auditoria, Administração |



---



## Checklist (marque ao concluir)



### 1. Coordenador — demanda e OS (&lt; 5 min)



- [ ] Login como **gestor@demo** (Coordenador)

- [ ] Sidebar mostra **Painel** e **Demandas** (sem Auditoria/Administração)

- [ ] Menu **Demandas** → escolher **finalidade** (IPTU, ITBI, OBRA, DENUNCIA ou RECADASTRAMENTO)

- [ ] Preencher **dados de referência** (campos mudam conforme a finalidade), bairro, prazo, endereço (opcional: **Usar GPS**)

- [ ] **Cadastrar demanda** — mensagem de sucesso; coluna **Finalidade** na fila

- [ ] Na fila, **Gerar OS** para o fiscal demo

- [ ] Confirmar OS no **Painel** (mapa ou lista) com finalidade visível



### 2. Agente de campo — Campo (celular ou outra aba)



- [ ] Login como **fiscal@demo** (Agente de campo; pode ser aba anônima)

- [ ] Sidebar mostra só **Campo**; tentar abrir `/demandas` redireciona para **Campo**

- [ ] **Campo** → selecionar a OS

- [ ] Conferir bloco **Dados de referência** (somente leitura)

- [ ] **Check-in GPS**

- [ ] Selecionar **Resultado da conferência** (de acordo / divergente / parcial)

- [ ] Marcar itens do **checklist** (itens específicos da finalidade)

- [ ] Adicionar fotos do imóvel **se possível** (roteiro na tela; opcional; máx. 10)

- [ ] **Assinatura** no quadro → salvar

- [ ] **Concluir vistoria**

- [ ] **Sincronizar pendentes** (se API ativa)



### 3. Coordenador — homologação e PDF



- [ ] Voltar como **gestor@demo** → **Painel**

- [ ] Fila **Homologação cadastral** mostra a OS com badge de finalidade

- [ ] Painel → card **Demandas sem OS — prazo** mostra D-1043 (prazo passado, seed)

- [ ] Painel → card **OS sem check-in** mostra OS-8821 com situação legível (ex.: “Vencida há N dias”)

- [ ] Demandas → coluna **Situação prazo** com badges (No prazo, Vencida, Aplicada em atraso…)

- [ ] Gerar OS após prazo → demanda **Aplicada em atraso**; check-in antes do prazo de campo → **Executada no prazo**

- [ ] **Imprimir laudo** → janela de impressão → **Salvar como PDF**

- [ ] PDF contém: **finalidade**, **dados de referência**, **resultado da conferência**, **Coord. referência (OS)** e **Check-in de presença** (linhas separadas), checklist, **tabela de fotos** (legenda + data + arquivo, se houver), assinatura

- [ ] Sem check-in na vistoria: linha **Check-in de presença** = “Não registrado”; **Coord. referência (OS)** ainda visível

- [ ] **Aprovar** homologação



### 4. Administrador — auditoria e configuração



- [ ] Login como **admin@demo** (Administrador)

- [ ] Menu: **Painel**, **Demandas**, **Auditoria**, **Administração**

- [ ] **Administração** → conferir resumo de config, habilitações por fiscal, import CSV

- [ ] **Auditoria** → log de eventos (requer API ativa)



---



## Cenários por finalidade (3 fluxos)



Execute pelo menos um cenário completo (demanda → OS → campo → laudo). Os campos de referência e o checklist mudam automaticamente.



### Cenário A — IPTU / avaliação cadastral



| Etapa | O que validar |

|-------|----------------|

| Demanda | Finalidade **IPTU**; preencher inscrição cadastral, área, uso e padrão |

| Campo | Checklist inclui *Área/uso constatados compatíveis com ficha cadastral* |

| Laudo | Cabeçalho: finalidade IPTU, dados de referência formatados, resultado conferência |



### Cenário B — Denúncia



| Etapa | O que validar |

|-------|----------------|

| Demanda | Finalidade **DENUNCIA**; motivo e protocolo de referência |

| Campo | Checklist inclui *Fato denunciado verificado no local*; usar fiscal habilitado (demo: Carlos) |

| Laudo | Divergência reflete resultado **divergente** ou **parcial** |



### Cenário C — Recadastramento (seed demo)



| Etapa | O que validar |

|-------|----------------|

| Painel | OS **OS-8823** já em homologação (seed) — finalidade Recadastramento |

| Laudo | Dados anteriores no cabeçalho; resultado **Divergente dos dados de referência** (seed) |

| Opcional | Nova demanda RECADASTRAMENTO com inscrição + dados anteriores e repetir fluxo |



---



## Critério de sucesso



| # | Critério |

|---|----------|

| 1 | Fluxo completo sem conta Google/Azure/Keycloak |

| 2 | Sem `docker compose` obrigatório |

| 3 | Laudo PDF com **finalidade**, **referência**, **resultado**, coord. ref. OS + check-in separados (fotos com legenda se houver) |

| 4 | Coordenador: menu **Painel** + **Demandas**; agente de campo: só **Campo**; admin: + **Auditoria** e **Administração** |

| 5 | Agente de campo não acessa `/demandas` nem `/painel` (redirect automático) |



---



## Se algo falhar



| Sintoma | Ação |

|---------|------|

| API indisponível | Verificar terminal `api`; abrir http://127.0.0.1:8790/health |

| Laudo em branco / sem pop-up | Permitir pop-ups no navegador |

| Fotos não no PDF | Sincronizar no fiscal antes; reabrir **Imprimir laudo** |

| Celular não abre o app | Mesma Wi-Fi; `npm run preview:lan` e usar IP do PC |

| Checklist antigo (5 itens fixos) | Limpar IndexedDB / recarregar seed; reiniciar app |
| GPS estático / sempre -23.55… | Ver seção **GPS no PC** abaixo; não deve gravar coords da OS se o GPS falhar |



## GPS no PC (localhost)



1. **Windows:** Configurações → Privacidade → **Localização** → ligada.
2. **Navegador:** em `http://127.0.0.1:5192`, permitir **Localização** para o site (ícone de cadeado na barra de endereço).
3. **Campo → Check-in GPS:** se a permissão estiver negada, a tela mostra erro em amarelo e **não** grava check-in com coords da OS demo.
4. Com permissão OK: bloco **Localização** mostra três linhas (imóvel, check-in, você agora); o mapa exibe pin laranja (você) e verde (check-in) quando diferentes da OS.
5. **Laudo PDF:** duas linhas — **Coord. referência (OS)** (cadastro) e **Check-in de presença** (GPS real do agente, com ± precisão e distância ao imóvel). Sem check-in: presença = “Não registrado”.
6. Se as coords parecerem imprecisas no PC: normal (Wi-Fi/rede); use celular em campo para precisão melhor.



Desativar modo piloto na UI (fases avançadas): em `app/.env` defina `VITE_PILOTO_LOCAL=false` e reinicie.

