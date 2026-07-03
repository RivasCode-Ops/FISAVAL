@echo off
setlocal
cd /d "%~dp0"
title FISAVAL - piloto local

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: instale Node.js LTS em https://nodejs.org
  pause
  exit /b 1
)

if not exist "app\node_modules" (
  echo Primeira vez? Rode INSTALAR-FISAVAL.bat antes.
  pause
  exit /b 1
)

if not exist "app\.env" (
  copy "app\.env.example" "app\.env" >nul
  echo Criado app\.env a partir do exemplo.
)
if not exist "api\.env" (
  copy "api\.env.example" "api\.env" >nul
  echo Criado api\.env a partir do exemplo.
)

echo.
echo FISAVAL - Modo piloto local
echo   App:  http://127.0.0.1:5192
echo   API:  http://127.0.0.1:8790
echo   Login gestor: gestor@demo / demo123
echo   Login fiscal: fiscal@demo / demo123
echo.
echo Para celular na mesma Wi-Fi: npm run preview:lan (apos build)
echo.

npm run dev:all
