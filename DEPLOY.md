# Por que o link não abria?

O workflow antigo falhou em `configure-pages` porque o **GitHub Pages não estava ativado** no repositório. O site nunca foi publicado (erro 404).

## Ativar o site (faça uma vez)

1. Abra: https://github.com/RivasCode-Ops/FISAVAL/settings/pages  
2. Em **Build and deployment** → **Source**, escolha: **Deploy from a branch**  
3. **Branch:** `gh-pages` → pasta **`/ (root)`** → **Save**  
4. Aguarde 1–3 minutos e abra: **https://rivascode-ops.github.io/FISAVAL/**

> Após cada `git push` na `main`, o Actions atualiza a branch `gh-pages` automaticamente.

### Alternativa (sem gh-pages)

Se preferir usar só a pasta `docs` na `main`:

- Source: **Deploy from a branch** → **main** → **`/docs`**

(O build já deixa os arquivos em `docs/` no repositório.)

## App local

```powershell
cd c:\_PROJETOS\E-FISCAL\app
npm install
npm run dev
```

http://127.0.0.1:5192 — `gestor@demo` / `fiscal@demo` — senha `demo123`

## Ver se o deploy rodou

https://github.com/RivasCode-Ops/FISAVAL/actions — workflow **Deploy GitHub Pages** deve estar verde.
