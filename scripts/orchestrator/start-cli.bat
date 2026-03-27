@echo off
title BMAD Orchestrator - CLI
cd /d "%~dp0"
if not exist "node_modules" npm install
echo Modo CLI interativo. Digite comandos:
echo   "pipeline completo pra <feature>" - fluxo BMAD completo
echo   "rodar queue" - implementar stories existentes
echo   "status" - ver progresso
echo   "smoke" - testar pipeline
echo   "sair" - encerrar
echo.
npx tsx orchestrator.ts %*
pause
