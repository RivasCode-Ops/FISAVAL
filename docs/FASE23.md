# Fase 23 — Push automático por prazo vencido

## Escopos de push

| Perfil | Endpoint subscribe | Escopo | Destino ao clicar |
|--------|-------------------|--------|-------------------|
| Fiscal | `POST /push/subscribe` | `nova_os` | `/campo` |
| Gestor/admin | `POST /push/subscribe` | `prazo_vencido` | `/painel` |
| Super-admin | `POST /push/subscribe/super` | global | `/super` |

## Disparo automático

Com VAPID configurado e `ALERTA_PUSH_ENABLED=1` (padrão):

- Ciclo na API a cada `ALERTA_PUSH_INTERVAL_HOURS` (padrão **6h**)
- Primeira verificação ~30s após subir o servidor
- Anti-spam: não reenvia se o total de OS vencidas não mudou dentro do intervalo

Por tenant: notifica gestores/admins inscritos em `prazo_vencido`.  
Cross-tenant: notifica inscrições em `api/data/super-push-subs.json`.

## Disparo manual

| Rota | Quem |
|------|------|
| `POST /alertas/prazo-vencido/disparar-push?force=1` | gestor, admin |
| `POST /super/alertas/prazo-vencido/disparar-push?all=1` | super-admin (todos os tenants) |

## App

- **Painel** (card de prazo): botão “Ativar notificação push (prazo)”
- **Global**: botão “Ativar push global (super-admin)”
- **Campo**: continua push de nova OS (`nova_os`)

## Config

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
ALERTA_PUSH_INTERVAL_HOURS=6
ALERTA_PUSH_ENABLED=1
```

`/config` retorna `pushEnabled`, `alertaPushEnabled`, `alertaPushIntervalHours`.

## Próximo

- E-mail SMTP — ver [FASE24.md](FASE24.md)
- Integração ICP-Brasil / gov.br em produção
- Seed PostgreSQL por tenant
