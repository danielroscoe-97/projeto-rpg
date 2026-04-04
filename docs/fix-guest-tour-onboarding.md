# Fix: Tour Guiado de Onboarding (Guest /try)

**Data**: 2026-04-03
**Commit**: `3bc5e29`
**Arquivos**: `MonsterSearchPanel.tsx`, `TourProvider.tsx`, `TourTooltip.tsx`

## Problema

O tour guiado de onboarding no modo visitante (`/try`) estava **completamente quebrado** — travava 100% no step 8 (desktop 8/13, mobile 8/11) para todos os novos visitantes.

### Causa Raiz

O seletor `'[data-tour-id="monster-result"] button'` no `TourProvider.tsx:275` capturava o **primeiro botão** dentro do card de resultado do monstro. Após refactor do `MonsterSearchPanel`, o primeiro botão no DOM passou a ser "Ver Ficha" (stat card) em vez de "Adicionar" (add to combat).

### Cadeia de Falhas

1. **Step 4**: Auto-clique abre stat card em vez de adicionar o Goblin
2. **Step 4**: No mobile, stat card cobre 100% do viewport (fullscreen block)
3. **Steps 5-7**: Tooltips flutuam sem âncora (elementos dependem de combatants na lista)
4. **Step 8**: `smartAdvance()` detecta `combatants.length === 0` → bloqueia transição setup→combat **silenciosamente**
5. Tour fica preso no step 8, botão "Próximo" não responde, sem feedback

### Bug Secundário

`data-tour-id="add-row"` foi perdido durante refactor do formulário de adição manual. O step 5 ("Adição Manual") não tinha âncora no desktop.

## Correções Aplicadas

### Fix 1 — Seletor do Auto-clique (BLOCKER)

- `MonsterSearchPanel.tsx:616`: Adicionado `data-tour-id="add-monster-btn"` no botão "Adicionar" (idx === 0)
- `TourProvider.tsx:281`: Seletor trocado de `'[data-tour-id="monster-result"] button'` para `'[data-tour-id="add-monster-btn"]'`

### Fix 2 — Supressão de Stat Card durante Tour

- `MonsterSearchPanel.tsx:598`: `onClick` do "Ver Ficha" verifica `useTourStore.getState().isActive` antes de chamar `pinCard()`

### Fix 3 — Âncora do Manual Add

- `MonsterSearchPanel.tsx:364`: `data-tour-id="add-row"` adicionado no botão "+ Monstro/Jogador Manual" (sempre visível)

### Fix 4 — Feedback Visual no Bloqueio

- `TourProvider.tsx:128`: Shake animation no tooltip quando `combatants.length === 0` bloqueia transição
- `TourProvider.tsx:37`: `shakeTimerRef` com cleanup no unmount (evita timer leak)
- `TourTooltip.tsx:375`: Transition duration alinhada (0.5s quando shake, 0.2s normal)

## Verificação

Testado via Playwright em ambos viewports:

| Viewport | Steps | Resultado |
|----------|-------|-----------|
| Desktop (1280x720) | 13/13 | Completo sem travamento |
| Mobile (390x844) | 11/11 | Completo sem travamento |
| Produção (vercel) | Smoke test | Goblin adicionado com sucesso no step 4 |

Screenshots em `qa-evidence/fix-*.png` e `qa-evidence/onboarding-*.png`.
