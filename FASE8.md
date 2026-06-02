# Fase 8 — Exportação CSV e relatório PDF

## Painel (gestor)

| Ação | Resultado |
|------|-----------|
| **CSV — OS do filtro** | Planilha das OS visíveis no mapa (status/fiscal) |
| **CSV — todas as OS** | Todas as ordens + colunas de vistoria (divergência, check-in, checklist) |
| **Imprimir / salvar PDF** | Janela de impressão do navegador → &quot;Salvar como PDF&quot; |

Arquivos: `fisaval-os-*.csv` (separador `;`, UTF-8 com BOM para Excel BR).

## Demandas

Botão **Exportar CSV** na fila de demandas.

## Colunas do CSV de OS

OS, demanda, fiscal, inscrição, endereço, bairro, status, rota, lat/lng, divergência, datas, itens do checklist marcados.

## Próximo

- Exportação na API (`GET /export/ordens.csv`) para auditoria servidor
- Notificações Web Push para nova OS
