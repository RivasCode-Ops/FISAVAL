# Publicar demo online (GitHub Pages)

**Sem npm, sem build, sem servidor.** Só HTML na pasta `docs/`.

## Passo 1 — Criar repositório no GitHub

No PowerShell, na pasta do projeto:

```powershell
cd c:\_PROJETOS\E-FISCAL
git init
git add .
git commit -m "Demo E-FISCAL para GitHub Pages"
```

Se ainda não tiver `gh` logado: `gh auth login`

Criar repo e enviar (ajuste o nome se quiser):

```powershell
gh repo create RivasCode-Ops/FISAVAL --public --source=. --remote=origin --push
```

O repositório [RivasCode-Ops/FISAVAL](https://github.com/RivasCode-Ops/FISAVAL) já existe (vazio). Só envie o código:

```powershell
git remote add origin https://github.com/RivasCode-Ops/FISAVAL.git
git branch -M main
git push -u origin main
```

## Passo 2 — Ativar Pages (uma vez)

1. Abra **https://github.com/RivasCode-Ops/FISAVAL**.
2. **Settings** → **Pages**
3. **Build and deployment** → Source: **Deploy from a branch**
4. Branch: **main** → Folder: **/docs** → **Save**

Em 1–3 minutos o site fica no ar.

## URL do demo

```
https://rivascode-ops.github.io/FISAVAL/
```

## Testar no celular

Abra a mesma URL no Chrome do celular — a aba **PWA Campo** simula o app do fiscal.

## Atualizar o demo

Edite arquivos em `docs/` (principalmente `js/mock-data.js` para textos/dados), depois:

```powershell
git add docs
git commit -m "Atualiza demo"
git push
```

O GitHub republica sozinho.

## Depois de aprovado

Aí sim: app com API, PostgreSQL, sync real (plano produção). Este demo continua como referência visual.
