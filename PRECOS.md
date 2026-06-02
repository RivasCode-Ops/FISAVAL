# Tabela de preços — E-FISCAL

Preencher com os valores comerciais (setup + mensalidade). Depois, colar a tabela na proposta junto com [COPY-PROPOSTA.md](./COPY-PROPOSTA.md).

---

## Plano Local / Desenvolvimento

| Item | Valor (R$) | Observação |
|------|------------|------------|
| Setup / implantação piloto | _a definir_ | Homologação, treinamento inicial, deploy VPS/local |
| Mensalidade (manutenção + suporte) | _a definir_ | Atualizações, backup assistido, suporte N2 |
| Infraestrutura (referência) | _custo do cliente ou repasse_ | ~2 vCPU, 4 GB RAM, 80 GB SSD |

---

## Plano Produção / Operação Cliente

| Item | Valor (R$) | Observação |
|------|------------|------------|
| Setup / implantação produção | _a definir_ | Produção, integrações, parametrização, go-live |
| Mensalidade (manutenção + suporte) | _a definir_ | SLA, monitoramento, evolução contratada |
| Infraestrutura (referência) | _custo do cliente ou repasse_ | 4–8 vCPU, 8–16 GB RAM, 200+ GB SSD, backups |

---

## Modelo sugerido na proposta (após preencher)

```markdown
| Plano | Setup | Mensalidade | Inclui |
|-------|-------|-------------|--------|
| Local / Desenvolvimento | R$ … | R$ …/mês | Piloto, módulos essenciais, PWA offline |
| Produção / Operação | R$ … | R$ …/mês | Suite completa, integrações, SLA produção |
```

**Opcionais** (linhas extras se fizer sentido no seu modelo):

- Treinamento presencial adicional
- Integração com sistema tributário / cadastro (projeto à parte)
- Hospedagem gerenciada pelo fornecedor (markup sobre cloud/VPS)

---

_Enviar os valores desejados (setup + mensal por plano) para montar a versão final “só colar” na proposta._
