@echo off
title BMAD Orchestrator - Taverna do Mestre
echo.
echo  ========================================
echo   BMAD Orchestrator - Taverna do Mestre
echo  ========================================
echo.
echo  NAO feche esta janela.
echo  NAO aperte Ctrl+C.
echo  Bot reinicia automaticamente se cair.
echo.
echo  Comandos no Slack:
echo    "implementar tudo"  - roda queue de stories
echo    "status"            - mostra progresso
echo    "pausar"            - pausa a queue
echo    "retomar"           - retoma a queue
echo.
cd /d "%~dp0scripts\orchestrator"
:loop
set NODE_OPTIONS=--no-warnings --max-old-space-size=4096
call node_modules\.bin\tsx.cmd slack-bot.ts < nul
echo.
echo  [%time%] Bot parou. Reiniciando em 5 segundos...
timeout /t 5 /nobreak > nul
goto loop
