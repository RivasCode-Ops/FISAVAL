# Domínio FISAVAL — análise comparativa (código vs. modelo)

Documento para alinhar produto, domínio e implementação. O FISAVAL é **gestão de demanda → OS → vistoria → laudo homologável**, não um app de GPS.

**Diagnóstico validado:** o fluxo nuclear já existe; o que falta é alinhar persistência mínima e apresentação para que GPS e fotos apareçam como **evidências da vistoria**, não como centro do sistema.

---

## 0. Regras fechadas (piloto)

| Conceito | Regra | Implementação atual |
|----------|-------|---------------------|
| **Coordenada de referência da OS** | Localização administrativa para mapa, rota e cadastro | `OrdemServico.lat/lng` — OK |
| **Check-in de presença** | GPS real em campo + data/hora + precisão quando disponível; **sem fallback silencioso** | `Vistoria.checkIn*` + `checkInAccuracyM`; laudo separa ref. OS vs. presença |
| **Registro fotográfico** | Imagem no local com legenda, data/hora e vínculo à vistoria | `VistoriaFoto.legenda` persistida; tabela no laudo |
| **Laudo** | Consolida finalidade, referência, conferência, evidências e conclusão | `buildLaudoHtml` — blocos GPS/fotos alinhados (seção 9) |
| **Homologação** | Decisão administrativa do coordenador | `homologar()` + status OS — sem entidade despacho (aceitável no piloto) |

**Fora do escopo desta fase:** tabelas separadas `laudo`, `homologacao`, `checkin_localizacao` — desde que dados mínimos fiquem no objeto principal e o laudo on-demand seja determinístico.

---

## 0.1 Vocabulário (copy de produto)

- **Coordenada de referência da OS** — mapa, localização administrativa, apoio de rota.
- **Check-in de presença** — capturado em campo com GPS real, data/hora e precisão (± m).
- **Registro fotográfico** — imagens no local, legenda descritiva, metadados mínimos.
- **Laudo** — saída documental: finalidade + referência + conferência + evidências + assinatura.
- **Homologação** — coordenador aprova ou devolve (status + ação, sem entidade própria por enquanto).

---

## 1. Matriz de entidades

| Entidade (modelo) | Status | Onde no código | Gap |
|-------------------|--------|----------------|-----|
| **Demanda** | Implementado | `Demanda` — `prazoVistoriaEm`, `dataInicioExecucaoEm`, `statusPrazo` derivado | Falta `origem` / `unidadeSolicitante` (backlog). |
| **Ordem de Serviço** | Implementado | `OrdemServico` | Relação demanda, agente, prazo, status, coords ref., rota: OK. |
| **Vistoria** | Implementado | `Vistoria` | Resultado conferência, checklist por finalidade, observação, assinatura, conclusão: OK. |
| **Check-in (GPS)** | Implementado | Campos em `Vistoria`: `checkInLat`, `checkInLng`, `checkInAt`, `checkInAccuracyM` | Não é tabela `checkin_localizacao` separada (aceitável no piloto). Laudo distingue ref. OS vs. check-in real. |
| **Foto** | Implementado | `VistoriaFoto` + `legenda` | Laudo usa metadados da foto (tabela + anexo). |
| **Laudo** | Implementado | `buildLaudoHtml` — `app/src/lib/export.ts` | Gerado on-demand (não entidade persistida). GPS/fotos estruturados conforme seção 5. |
| **Homologação** | Parcial | `homologar()` + status OS | Sem entidade com despacho, responsável, data dedicados. Aprovar/devolver funciona via status. |
| **Perfis** | Implementado | `fiscal` / `gestor` / `admin` + `roleLabels.ts` | UI: Agente de campo, Coordenador, Administrador. Guards e AdminPage: OK. |

---

## 1.1 Prazo para vistoria (dois níveis)

Controle interno de expectativa de atendimento — **não usar “SLA” na UI principal**.

| Nível | Campo | Marco | Situação derivada |
|-------|-------|-------|-------------------|
| **Demanda** | `prazoVistoriaEm` | `dataInicioExecucaoEm` (gerar OS) | No prazo · A vencer · Vencida · Aplicada no/em atraso |
| **Campo (OS)** | `prazoCampoEm` | `Vistoria.checkInAt` | No prazo · A vencer · Vencida · Executada no/em atraso |

- Cálculo: `app/src/lib/prazoStatus.ts` (espelho em `api/src/prazoStatus.ts`).
- Alertas Painel: demandas abertas + OS ativas sem check-in (`A_VENCER` ou `VENCIDA`).
- Alias legado: `prazo` em demanda/OS mantido durante transição.

---

## 2. Fluxo macro — bate com o código?

| Passo | OK? | Implementação |
|-------|-----|---------------|
| Coordenador registra demanda (finalidade + referência) | Sim | `DemandasPage` → `createDemanda` |
| Sistema gera OS e atribui agente | Sim | `gerarOs` |
| Agente: check-in, referência, conferência, checklist, fotos, assinatura | Sim | `CampoPage` (seções colapsáveis) |
| Sync + laudo disponível no painel | Sim | `syncPendentes`, fila homologação |
| Coordenador: laudo PDF, homologar/devolver | Sim | `PainelPage` → `buildLaudoHtml`, `homologar` |

**Conclusão:** o fluxo orquestrado existe. O desvio de percepção (“só GPS”) vem de **ênfase na UI/laudo** e do fallback de coordenadas, não de ausência de demanda/conferência/laudo.

---

## 3. Papel do GPS — regra de produto vs. código

| Uso (modelo) | Código hoje | Ação recomendada |
|--------------|-------------|------------------|
| Evidência de presença | `checkIn*` na vistoria; sem check-in não grava coords falsas | Manter. Adicionar `checkInAccuracyM` no save. |
| Mapa / rota | `PainelMap`, `RotaMap` | OK — apoio operacional. |
| Linha no laudo | ~~Campo único “GPS” com fallback~~ | **Feito:** “Coord. referência (OS)” e “Check-in de presença” separados. |

~~Trecho problemático (`export.ts` ~217–221) — removido na seção 9.~~

---

## 4. Registro fotográfico — modelo vs. laudo

| Modelo | Código hoje | Status |
|--------|-------------|--------|
| Tabela: Foto N — legenda — data — arquivo | `fotoList` no laudo; tabela HTML + anexo | OK |
| Legenda por captura | `uploadFoto(..., legenda)` + roteiro em Campo | OK |
| Tipo (fachada/evidência) | Não | Opcional; legenda basta no piloto |

---

## 5. Textos de tela (não centrar em GPS)

| Tela | Hoje | Sugestão |
|------|------|----------|
| **Demandas** | “Cadastre novas demandas…” | “Pedidos internos por finalidade (IPTU, ITBI…), com dados de referência do cadastro.” |
| **Campo** | “N OS atribuída(s)” | “Vistoria em campo: conferência, checklist, fotos e assinatura. Check-in GPS comprova presença no imóvel.” |
| **Painel** | “Laudos, mapa…” | “Homologação de laudos, indicadores e mapa — decisão sobre o que foi constatado em campo.” |
| Seção Localização | Só “Check-in GPS” | Subtítulo: “Evidência de presença (opcional até concluir conferência).” |

---

## 6. Plano de aplicação (prioridade)

### Alta (alinha domínio sem migration pesada)

1. **`export.ts` — laudo**
   - Dois campos: coord. referência OS vs. check-in de presença (+ precisão, distância ao imóvel se check-in existir).
   - Remover fallback de GPS do laudo para coords da OS.
   - Seção fotos: tabela resumida + anexo com legendas de `fotoList`.

2. **`CampoPage` — check-in**
   - Gravar `checkInAccuracyM` em `saveVistoria`.

3. **`fotos.ts` / `uploadFoto`**
   - Parâmetro `legenda` (roteiro: `FOTOS_IMOVEL_ROTEIRO[fotos.length]`).

4. **`types.ts`** (+ API mirror)
   - `Vistoria.checkInAccuracyM?`, `VistoriaFoto.legenda?`.

5. **PageHeader** em Demandas, Campo, Painel — textos da seção 5.

### Média (backlog)

- Campo `origem` / `unidadeSolicitante` em Demanda.
- Entidade ou registro explícito de Homologação (despacho, gestor, timestamp).
- Laudo persistido com versão/status.
- Backend gera laudo após sync (hoje: preview no gestor).

### Baixa

- Tabela `checkin_localizacao` separada.
- Geo por foto.
- Geração automática pós-`ConcluirVistoria` no servidor.

---

## 7. Use cases (services) — mapa mental

| Use case (modelo) | Função existente |
|-------------------|------------------|
| CriarDemanda | `createDemanda` |
| EmitirOS | `gerarOs` |
| RegistrarCheckin | `checkIn` + `saveVistoria` |
| ConcluirVistoria | `concluirVistoria` |
| GerarLaudo | `buildLaudoHtml` (não persistido) |
| HomologarLaudo | `homologar` |

---

## 8. Critério de “alinhado ao domínio”

- [x] Laudo distingue coordenada de referência (OS) vs. check-in de presença.
- [x] Sem coords da OS rotuladas como prova de presença do agente.
- [x] Fotos no laudo com legenda + data/hora + arquivo.
- [x] Check-in persiste precisão (`checkInAccuracyM`) quando disponível.
- [x] Textos de tela mencionam finalidade, conferência e homologação antes de GPS.
- [x] TESTE-MANUAL descreve fluxo completo (já parcialmente OK).

---

## 9. Checklist de implementação (Cursor — seção 6)

Executar em **modo agente**, na ordem abaixo. Estimativa: ~1 sessão, sem migration SQL.

### 9.1 Tipos

- [x] `app/src/types.ts`: adicionar `Vistoria.checkInAccuracyM?: number` e `VistoriaFoto.legenda?: string`.
- [x] `api/src/types.ts`: espelhar `legenda` em `VistoriaFoto` (check-in accuracy pode ficar só no app/Dexie no piloto, ou espelhar em `Vistoria` API se sync já envia vistoria completa).

### 9.2 Check-in de presença

- [x] `CampoPage.tsx` — em `checkIn()`, incluir `checkInAccuracyM: accuracyM` em `saveVistoria`.
- [x] Confirmar: sem check-in, laudo e UI mostram “não registrado” (nunca coords da OS como presença).

### 9.3 Registro fotográfico

- [x] `app/src/db/fotos.ts` — `saveFotoLocal(vistoriaId, file, legenda?)` persiste `legenda`.
- [x] `fisavalService.ts` — `uploadFoto(vistoriaId, file, legenda?)` repassa legenda.
- [x] `CampoPage.tsx` — ao upload, passar `FOTOS_IMOVEL_ROTEIRO[fotos.length]` ou legenda genérica “Evidência N”.

### 9.4 Laudo (`export.ts`)

- [x] Estender `LaudoHomologacaoPayload` com `fotos?: VistoriaFoto[]` (ou items com url).
- [x] Remover fallback `os.lat/lng` no bloco de check-in de presença.
- [x] `<dl>` do laudo:
  - `Coord. referência (OS)` — sempre `os.lat/lng` + link Maps.
  - `Check-in de presença` — só se `checkInLat/Lng`; incluir data/hora, ± precisão, distância ao imóvel (`distanciaMetros`).
  - Se ausente: “Não registrado”.
- [x] Seção **Registro fotográfico**:
  - Tabela: Nº | Legenda | Data/hora | Arquivo.
  - Anexo: miniaturas com legenda.
- [x] `PainelPage.tsx` — `verLaudo()` passa `fotoList` para `buildLaudoHtml`.

### 9.5 Textos de tela

- [x] `DemandasPage` — PageHeader description (seção 5).
- [x] `CampoPage` — PageHeader + nota na seção Localização (“evidência de presença”).
- [x] `PainelPage` — PageHeader description (seção 5).

### 9.6 Validação

- [x] `npm run typecheck`.
- [x] Fluxo manual: demanda IPTU → OS → check-in → 1 foto → laudo PDF:
  - referência OS e check-in em linhas distintas;
  - foto com legenda do roteiro na tabela;
  - sem check-in: linha de presença = “Não registrado”, ref. OS ainda visível.

---

Para executar: modo agente + “aplique a seção 9 do DOMINIO-FISAVAL.md”.
