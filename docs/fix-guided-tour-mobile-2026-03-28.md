# Fix: Guided Tour Mobile — Truncated Tooltip + Broken Monster Search

**Data:** 2026-03-28
**Severidade:** Cat.2 — UX blocker no onboarding mobile
**Status:** Resolvido

---

## Problema Reportado

O tour guiado (`/try`) apresentava dois bugs críticos no mobile:

1. **Step 0 (Welcome):** Tooltip truncado — texto cortado, impossível rolar, botões "Próximo"/"Pular" invisíveis
2. **Step 1 (Monster Search):** Busca de monstro não funcionava — resultados escondidos atrás do overlay, input bloqueado

## Root Cause

### Bug 1 — Tooltip Truncado

O `TourTooltip` usa `position: fixed` com coordenadas calculadas via `computePosition()`. O target do step Welcome (`[data-tour-id="welcome"]`) engloba toda a seção de setup, que em mobile ocupa >50% do viewport. O tooltip era posicionado abaixo do target (que vai até o fundo da tela), sem `max-height` nem `overflow-y`, fazendo o conteúdo transbordar o viewport.

### Bug 2 — Busca Bloqueada

Dois problemas combinados:

- **Overlay z-index:** O `TourOverlay` fica em `z-index: 10000`. Os resultados de busca (dropdown) renderizam no fluxo normal da página, ficando visualmente ocultos atrás do overlay escuro.
- **Pointer-events invertido:** O overlay tinha `pointer-events: none` (tudo passava), mas o `allowInteraction` div tinha `pointer-events: auto` (bloqueava o target). Lógica completamente invertida.

## Correções Aplicadas

### 1. TourTooltip.tsx — Bottom-sheet mobile + scroll

- Quando target > 50% do viewport (mobile), tooltip se posiciona como bottom-sheet fixo (`bottom: 16px`)
- `max-height` dinâmico baseado na posição real do tooltip
- `overflow-y: auto` para conteúdo longo

### 2. TourOverlay.tsx — Pointer-events corrigido

- Steps interativos: `pointer-events: none` no overlay (tudo clicável)
- Steps info: `pointer-events: auto` no overlay (bloqueia interação com a página)
- Removido o `allowInteraction` div que bloqueava o target

### 3. TourProvider.tsx — Z-index elevation

- Em steps interativos, o target element recebe `position: relative; z-index: 10001` (acima do overlay)
- Isso eleva todo o painel de busca (input + dropdown de resultados) acima do overlay
- Z-index é limpo automaticamente ao trocar de step ou sair do tour

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `components/tour/TourTooltip.tsx` | Bottom-sheet mobile, max-height dinâmico, safe positioning |
| `components/tour/TourOverlay.tsx` | Pointer-events corrigido, removido div que bloqueava target |
| `components/tour/TourProvider.tsx` | Z-index elevation para steps interativos |

## QA Validação

Testado com Playwright em viewport 375x667 (iPhone SE):

- Step 0 (Welcome): tooltip visível com botões acessíveis
- Step 1-2 (Monster Search): busca "goblin" retorna resultados visíveis e clicáveis
- Steps 3-11: todos tooltips legíveis, spotlight correto, navegação fluida
- Tour completo do início ao fim sem bloqueios

Screenshots em `qa-screenshots/tour-step*-mobile*.png`
