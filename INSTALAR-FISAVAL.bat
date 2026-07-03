@echo off

setlocal

cd /d "%~dp0"

title FISAVAL - instalacao



where node >nul 2>&1

if errorlevel 1 (

  echo.

  echo ERRO: Node.js nao encontrado.

  echo Baixe e instale LTS em https://nodejs.org

  echo Depois rode este arquivo de novo.

  echo.

  pause

  exit /b 1

)



echo.

echo FISAVAL - Instalacao (primeira vez)

echo Node: 

node -v

echo.



echo [1/3] Dependencias da raiz...

call npm install

if errorlevel 1 goto :fail



echo [2/3] Dependencias do app...

call npm install --prefix app

if errorlevel 1 goto :fail



echo [3/3] Dependencias da API...

call npm install --prefix api

if errorlevel 1 goto :fail



if not exist "app\.env" (

  copy "app\.env.example" "app\.env" >nul

  echo Criado app\.env

)

if not exist "api\.env" (

  copy "api\.env.example" "api\.env" >nul

  echo Criado api\.env

)



echo.

echo OK. Instalacao concluida.

echo.

echo Proximo passo: execute INICIAR-FISAVAL.bat

echo   App:  http://127.0.0.1:5192

echo   Login: gestor@demo / demo123

echo.

pause

exit /b 0



:fail

echo.

echo Instalacao falhou. Verifique a internet e o Node.js.

pause

exit /b 1

