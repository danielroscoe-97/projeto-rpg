@echo off
title BMAD Orchestrator
cd /d "%~dp0"

:start
echo ========================================
echo   BMAD Orchestrator - Taverna do Mestre
echo ========================================
echo.
echo Verificando dependencias...
where node >nul 2>&1 || (echo ERRO: Node.js nao encontrado! & timeout /t 5 & goto start)
where claude >nul 2>&1 || (echo ERRO: Claude CLI nao encontrado! & timeout /t 5 & goto start)
where gh >nul 2>&1 || echo AVISO: GitHub CLI nao encontrado - PRs nao serao criados
if not exist ".env" (echo ERRO: .env nao encontrado! & timeout /t 10 & goto start)
if not exist "node_modules" (echo Instalando dependencias... & npm install)
echo.
echo Modo: Slack Bot (Socket Mode)
echo Para usar: mande mensagens no canal do Slack
echo Para parar: Ctrl+C ou feche esta janela
echo.
echo Iniciando...
echo.
npx tsx slack-bot.ts
echo.
echo Orchestrator parou. Reiniciando em 10s...
timeout /t 10 /nobreak
goto :start
