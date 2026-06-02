# ⚠️ Link 404? Ative o GitHub Pages (1 minuto)

O app **já foi publicado** na branch `gh-pages` pelo Actions (deploy verde).

O 404 acontece porque o GitHub **ainda não está servindo** o site — falta ligar o Pages no repositório.

## Passo a passo

1. Abra: **https://github.com/RivasCode-Ops/FISAVAL/settings/pages**

2. Em **Build and deployment** → **Source**:
   - Escolha: **Deploy from a branch**

3. Configure:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
   - Clique **Save**

4. Espere aparecer a mensagem verde (ex.: *Your site is live at...*)

5. Abra: **https://rivascode-ops.github.io/FISAVAL/**

## Opção B (sem gh-pages)

- Branch: `main`
- Folder: `/docs`

---

Deploy automático: a cada push na `main`, o Actions atualiza `gh-pages`.  
Status: https://github.com/RivasCode-Ops/FISAVAL/actions
