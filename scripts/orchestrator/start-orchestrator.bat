@echo off
title BMAD Orchestrator
echo ========================================
echo   BMAD Orchestrator - Taverna do Mestre
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando dependencias...
where node >/dev/null 2>&1 || (echo ERRO: Node.js nao encontrado! & pause & exit /b 1)
where claude >/dev/null 2>&1 || (echo ERRO: Claude CLI nao encontrado! & pause & exit /b 1)
where gh >/dev/null 2>&1 || (echo AVISO: GitHub CLI nao encontrado - PRs nao serao criados)

if not exist ".env" (echo ERRO: .env nao encontrado! Copie .env.example e preencha. & pause & exit /b 1)
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

:start
npx tsx slack-bot.ts
goto :start
