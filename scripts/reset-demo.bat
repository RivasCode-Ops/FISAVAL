@echo off

setlocal

cd /d "%~dp0.."

title FISAVAL - reset demo



echo.

echo FISAVAL - Reset dados demo

echo.



node scripts/reset-demo.mjs



echo.

pause

