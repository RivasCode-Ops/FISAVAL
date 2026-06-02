# Fase 24 — E-mail SMTP por prazo vencido

## Canais de alerta

| Canal | Config | Destinatários |
|-------|--------|---------------|
| Push | VAPID | Inscrição no navegador |
| **E-mail** | SMTP | Gestores/admins do tenant + extras |

Os dois usam o mesmo intervalo (`ALERTA_PUSH_INTERVAL_HOURS`) e throttle independente por canal.

## SMTP

```env
ALERTA_EMAIL_ENABLED=1
SMTP_HOST=smtp.seudominio.gov.br
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=fisaval@prefeitura.gov.br
ALERTA_EMAIL_TO=gestor@prefeitura.gov.br,ti@prefeitura.gov.br
ALERTA_EMAIL_SUPER=admin@demo
```

- **Por tenant**: e-mails de usuários `gestor` e `admin` no banco + `ALERTA_EMAIL_TO`
- **Global**: `SUPER_ADMIN_EMAILS` + `ALERTA_EMAIL_SUPER`

## Ciclo automático

Com SMTP configurado, o ciclo da API envia push (se VAPID) e e-mail no mesmo agendamento.

## Disparo manual

| Rota | Efeito |
|------|--------|
| `POST /alertas/prazo-vencido/disparar-email?force=1` | Só e-mail (tenant) |
| `POST /alertas/prazo-vencido/disparar?force=1` | Push + e-mail (tenant) |
| `POST /super/alertas/prazo-vencido/disparar?all=1` | Push + e-mail (todos os tenants + super) |

`/config` inclui `smtpEnabled` e `alertaEmailEnabled`.

## App

Painel: aviso “E-mail automático ativo” quando SMTP está ligado na API.

## Próximo

- Integração ICP-Brasil / gov.br em produção
- Seed PostgreSQL por tenant na primeira visita
- Template HTML no e-mail (opcional)
