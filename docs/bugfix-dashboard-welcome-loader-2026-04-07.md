# Bugfix: Dashboard Welcome Loader One-Time Display

Data: 2026-04-07
Status: concluido

## Problema

O fake loading da area logada reaparecia ao voltar para o dashboard ou ao remontar o layout interno, mesmo depois de o usuario ja estar dentro da experiencia autenticada.

Isso piorava a percepcao de fluidez e fazia a navegacao parecer mais lenta do que realmente era.

## Causa raiz

O componente [DashboardLoadingScreen](../components/dashboard/DashboardLoadingScreen.tsx) iniciava o overlay no `mount` sem exigir `?welcome=1` nem guardar memoria de exibicao na sessao atual.

## Solucao aplicada

- O overlay agora so abre quando a URL chega com `?welcome=1`.
- A primeira exibicao grava `dashboardWelcomeLoaderShown` em `sessionStorage`.
- Se o usuario voltar ao dashboard na mesma sessao, o loader nao reaparece.
- O parametro `welcome` e removido da URL depois da decisao de exibicao para evitar replays acidentais.

## Impacto esperado

- Primeira entrada no dashboard continua com o polish do welcome loader.
- Navegacao interna na area logada fica imediata, sem reexibir o fake load.
- A mudanca fica confinada ao dashboard autenticado, sem impacto nos fluxos de combate guest, anonimo ou autenticado.

## Validacao

- `rtk tsc --noEmit`
