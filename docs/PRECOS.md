# Tabela de preços — E-FISCAL / FISAVAL

Valores de **referência para proposta** (piloto local validado). Ajuste conforme município e escopo. Use junto com [COPY-PROPOSTA.md](./COPY-PROPOSTA.md).

---

## Plano Local / Piloto

| Item | Valor (R$) | Observação |
|------|------------|------------|
| Setup / implantação piloto | **4.800** | Instalação no PC/servidor da prefeitura, 2 usuários demo → produção piloto, treinamento 4 h |
| Mensalidade (manutenção + suporte) | **890**/mês | Atualizações, backup assistido remoto, suporte e-mail/WhatsApp horário comercial |
| Infraestrutura (referência) | **custo do cliente** | PC existente ou VPS ~2 vCPU, 4 GB RAM, 80 GB SSD (~R$ 80–150/mês em cloud) |

**Inclui no piloto:** PWA campo offline, demandas, OS, vistoria (foto/GPS), homologação, laudo PDF, API JSON local.

**Não inclui:** PostGIS em produção, VROOM, SSO, integração IPTU legado, comparativo automático.

---

## Plano Produção / Operação

| Item | Valor (R$) | Observação |
|------|------------|------------|
| Setup / implantação produção | **12.000 – 28.000** | PostGIS, multi-usuário, parametrização cadastro, go-live (faixa conforme integrações) |
| Mensalidade (manutenção + suporte) | **2.400 – 4.900**/mês | SLA 99,5%, backup diário, evolução contratada (faixa por volume de imóveis/OS) |
| Infraestrutura (referência) | **repasse ou gerenciada** | 4–8 vCPU, 8–16 GB RAM, 200+ GB SSD, backups |

**Inclui:** Suite completa documentada (fases 3–18 conforme contrato), hospedagem opcional gerenciada, roteirização, relatórios, tenants.

---

## Tabela para colar na proposta

```markdown
| Plano | Setup | Mensalidade | Inclui |
|-------|-------|-------------|--------|
| Local / Piloto | R$ 4.800 | R$ 890/mês | PWA offline, demanda→OS→vistoria→laudo PDF, suporte piloto |
| Produção / Operação | R$ 12.000+ | R$ 2.400+/mês | PostGIS, integrações, SLA, roteirização, multi-tenant |
```

---

## Opcionais (projeto à parte)

| Opcional | Referência |
|----------|------------|
| Treinamento presencial adicional | R$ 800/dia (até 12 pessoas) |
| Integração sistema tributário / cadastro legado | Orçamento após levantamento (40–120 h) |
| Hospedagem gerenciada RivasCode | Markup ~20% sobre VPS/cloud do cliente |
| Comparativo mercado + camada entorno (fase 2) | R$ 3.500 – 8.000 setup + mensalidade +R$ 400 |

---

## Condições comerciais sugeridas

- **Pagamento setup:** 50% na assinatura, 50% no go-live piloto.
- **Mensalidade:** vencimento dia 10; mínimo 12 meses após produção.
- **Piloto:** até 3 meses; crédito de até 50% do setup na migração para Plano Produção.

---

_Atualizado para alinhamento com [MODO-LOCAL-SOLO.md](./MODO-LOCAL-SOLO.md). Revisar valores antes de cada proposta formal._
