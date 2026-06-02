# Publicar FISAVAL

## App completo (recomendado)

O produto está em `app/` (React + PWA + IndexedDB). Funciona **sem servidor** no celular e no PC.

### Local

```powershell
cd c:\_PROJETOS\E-FISCAL\app
npm install
npm run dev
```

Abra **http://127.0.0.1:5192**

| Perfil | Login | Senha |
|--------|-------|-------|
| Gestor | gestor@demo | demo123 |
| Fiscal | fiscal@demo | demo123 |

### Online (GitHub Pages)

1. Push na branch `main` do [RivasCode-Ops/FISAVAL](https://github.com/RivasCode-Ops/FISAVAL)
2. **Settings → Pages → Source: GitHub Actions** (workflow `.github/workflows/pages.yml`)
3. URL: **https://rivascode-ops.github.io/FISAVAL/**

Build manual (opcional):

```powershell
cd c:\_PROJETOS\E-FISCAL
npm run build:pages
git add docs app
git commit -m "Build Pages"
git push
```

### API opcional (sync log)

```powershell
cd c:\_PROJETOS\E-FISCAL\api
npm install
npm run dev
```

Em `app/.env`: `VITE_API_URL=http://127.0.0.1:8790`
