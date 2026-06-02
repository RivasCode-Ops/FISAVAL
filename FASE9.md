# Fase 9 — Export na API + Web Push

## CSV no servidor (auditoria)

Com JWT de gestor/admin:

| Endpoint | Arquivo |
|----------|---------|
| `GET /api/fisaval/export/ordens.csv` | Todas as OS + vistorias |
| `GET /api/fisaval/export/demandas.csv` | Todas as demandas |

No **Painel**, botões **CSV servidor (OS)** e **CSV servidor (demandas)** (modo API).

## Web Push (nova OS para o fiscal)

### Gerar chaves VAPID

```powershell
cd c:\_PROJETOS\E-FISCAL\api
node scripts/generate-vapid.mjs
```

Copie para `api/.env`:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:gestor@prefeitura.local
```

Reinicie a API. No **Campo**, fiscal toca **Ativar alertas de nova OS**.

Quando o gestor **gerar OS**, o fiscal recebe notificação (com app instalado / PWA).

### Sem VAPID

- Push no servidor retorna 503; app ainda alerta via **Notification API** quando o número de OS sobe (app aberto ou polling).

## Testar fluxo push

1. `npm run dev:all` com VAPID no `api/.env`
2. `fiscal@demo` → Campo → Ativar alertas
3. `gestor@demo` → Demandas → Gerar OS para o fiscal
4. Notificação no dispositivo do fiscal
