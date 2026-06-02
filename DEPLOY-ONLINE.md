# Deploy online completo (Pages + API Render)

Guia em 15 minutos para o demo público com **dados compartilhados** entre celular e painel.

## 1. GitHub Pages (front)

1. Repo: https://github.com/RivasCode-Ops/FISAVAL  
2. **Settings → Pages** → Source: branch **`gh-pages`** → folder **`/` (root)**  
3. Aguarde o workflow **Deploy GitHub Pages** após push em `main`.  
4. URL: https://rivascode-ops.github.io/FISAVAL/

Sem API, o app usa só IndexedDB no navegador (modo demo local).

## 2. API no Render

1. Conta em https://render.com  
2. **New +** → **Blueprint** → conecte o repo `RivasCode-Ops/FISAVAL`  
3. Aprove o [render.yaml](../render.yaml) (serviço `fisaval-api`, Docker).  
4. Após o deploy, copie a URL HTTPS, ex.: `https://fisaval-api-xxxx.onrender.com`  
5. Teste: `https://SUA-URL/health` → `{ "ok": true, ... }`

Variáveis já no blueprint:

| Variável | Valor |
|----------|--------|
| `CORS_ORIGIN` | `https://rivascode-ops.github.io` |
| `JWT_SECRET` | gerado automaticamente |

## 3. Ligar front à API (secret GitHub)

1. GitHub → repo **FISAVAL** → **Settings → Secrets and variables → Actions**  
2. **New repository secret**  
   - Name: `VITE_API_URL`  
   - Value: URL da API **sem barra no final** (ex. `https://fisaval-api-xxxx.onrender.com`)  
3. **Actions** → workflow **Deploy GitHub Pages** → **Run workflow** (ou push vazio em `main`)

O build grava `VITE_API_URL` em `app/.env` e o PWA passa a mostrar **Modo servidor** no login.

## 4. Validar ponta a ponta

| Passo | Conta | Ação |
|-------|--------|------|
| 1 | `gestor@demo` / `demo123` | Demandas → criar demanda → gerar OS para fiscal |
| 2 | `fiscal@demo` / `demo123` | Campo → vistoria → sincronizar |
| 3 | `gestor@demo` | Painel → mapa + homologar |

Senha demo: `demo123` em todas as contas `@demo`.

## 5. Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Pages 404 | Ativar branch `gh-pages` em Settings → Pages |
| Login sem “Modo servidor” | Secret `VITE_API_URL` ausente ou rebuild não rodou |
| CORS / fetch falha | `CORS_ORIGIN` na API deve incluir `https://rivascode-ops.github.io` |
| API dorme (free) | Primeiro acesso pode levar ~30s (cold start Render) |

## Build local com API pública

```powershell
cd c:\_PROJETOS\E-FISCAL\app
$env:VITE_API_URL="https://sua-api.onrender.com"
npm run build:pages
cd ..
node scripts/copy-to-docs.mjs
```
