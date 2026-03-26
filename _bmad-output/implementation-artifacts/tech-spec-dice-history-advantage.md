---
title: 'Dice Roll History Panel + Advantage/Disadvantage'
slug: 'dice-history-advantage'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'React 19', 'TypeScript', 'Zustand', 'Tailwind CSS', 'CSS (stat-card-5e.css)']
files_to_modify: ['lib/dice/roll.ts', 'lib/stores/dice-history-store.ts (new)', 'components/dice/ClickableRoll.tsx', 'components/dice/DiceHistoryPanel.tsx (new)', 'styles/stat-card-5e.css', 'app/app/layout.tsx']
code_patterns: ['Zustand stores with persist middleware + sessionStorage', 'CustomEvent for cross-component communication', 'Fixed-position floating UI (see OracleFAB, FloatingCardContainer)', 'CSS scoped to .stat-card-5e namespace for dice components']
test_patterns: ['No test files for dice components yet — manual testing via dev server']
---

# Tech-Spec: Dice Roll History Panel + Advantage/Disadvantage

**Created:** 2026-03-25

## Overview

### Problem Statement

O DM rola dados clicáveis no stat block do monstro, mas o resultado desaparece em 4s sem registro. Não há histórico de rolls anteriores, nem suporte a vantagem/desvantagem — mecânicas core do D&D 5e que são usadas em praticamente todo roll de d20.

### Solution

1. **Roll History Panel** — painel flutuante bottom-right estilo chat com histórico de todos os rolls da sessão.
2. **Advantage/Disadvantage** — Shift+click rola 2d20 keep highest (vantagem), Ctrl+click rola 2d20 keep lowest (desvantagem) em qualquer roll que envolva 1d20. Em rolls de dano, Shift+click aplica **crítico** (dobra os dados), Ctrl+click aplica **resistência** (divide o total por 2, arredonda pra baixo).
3. **Tooltip de atalhos** — hover nos botões `dice-roll-btn` mostra tooltip explicando os atalhos contextuais (d20: Advantage/Disadvantage, dano: Critical/Resistance).

### Scope

**In Scope:**

- Zustand store para histórico de rolls (session storage, max 50 entries)
- Componente `DiceHistoryPanel` — floating bottom-right, collapsible, scrollável, auto-scroll
- Extensão do `roll()` engine para suportar advantage/disadvantage (d20) e critical/resistance (dano)
- Extensão do `ClickableRoll` para detectar Shift/Ctrl no click event com comportamento contextual
- `RollResult` expandido com campos `mode` e `discardedDice`
- Tooltip enriquecido nos botões de dice com instruções de atalho contextuais
- Resultado visual diferenciado no popover e no histórico para adv/dis/crit/resist
- Botão de limpar histórico

**Out of Scope:**

- Persistência entre sessões/page refresh (sessionStorage only)
- Compartilhamento de rolls com jogadores
- Som/animação dos dados
- Filtragem/busca no histórico

## Context for Development

### Codebase Patterns

- **Zustand stores:** Interface de state + actions separadas, `create<T>()(persist(...))` com `createJSONStorage(() => sessionStorage)`, SSR fallback com `getSessionStorage()`. Ref: `lib/stores/pinned-cards-store.ts`.
- **CustomEvent para cross-component comms:** `ClickableRoll` já usa `window.dispatchEvent(new CustomEvent('dice-roll-dismiss'))` para dismissar popovers. O mesmo pattern será usado para publicar rolls ao history store.
- **CSS:** Estilos de dice vivem em `styles/stat-card-5e.css` sob namespace `.stat-card-5e` para botões inline, e sem namespace para `.dice-popover` (global, pois renderiza em portal). O history panel seguirá o mesmo approach — CSS global para o painel flutuante.
- **Floating UI:** `OracleFAB` usa `fixed bottom-6 right-6` para positioning. O history panel usará posição similar mas acima do FAB.
- **Layout:** `app/app/layout.tsx` renderiza componentes globais (navbar, command palette, FAB). O `DiceHistoryPanel` será adicionado aqui.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `lib/dice/roll.ts` | Engine de rolagem — será estendido com advantage/disadvantage |
| `lib/dice/parse-dice.ts` | Parser de notação — não precisa mudança |
| `components/dice/ClickableRoll.tsx` | Botão inline — será estendido com Shift/Ctrl detection + tooltip |
| `components/dice/DiceText.tsx` | Wrapper de texto — não precisa mudança |
| `lib/stores/pinned-cards-store.ts` | Pattern de referência para o novo store |
| `styles/stat-card-5e.css` | CSS do dice roller — será estendido com history panel + advantage styles |
| `app/app/layout.tsx` | Layout global — montará o DiceHistoryPanel |
| `components/oracle/OracleFAB.tsx` | Referência de positioning bottom-right |

### Technical Decisions

1. **Zustand store vs React context:** Zustand — consistente com o projeto, suporta persist middleware, acessível de qualquer componente sem prop drilling.
2. **CustomEvent vs store subscription:** O `ClickableRoll` já dispatcha eventos globais. Ao invés de ter o componente importar o store diretamente (acoplamento), ele dispatchará um `dice-roll-result` event com o `RollResult`. O store escutará esse evento. Isso mantém o `ClickableRoll` desacoplado e testável.
3. **Modifier modes no engine:** O `roll()` receberá um `mode` param opcional. Para **d20 rolls**: `"advantage"` (2d20 keep highest) / `"disadvantage"` (2d20 keep lowest). Para **damage rolls** (non-d20): `"critical"` (dobra a quantidade de dados, ex: 2d6+5 vira 4d6+5) / `"resistance"` (rola normal, divide total por 2 arredondado pra baixo). O `ClickableRoll` detecta o contexto (d20 vs dano) e mapeia Shift/Ctrl para o mode correto.
4. **History limit:** 50 entries max, FIFO eviction. SessionStorage para não crescer indefinidamente.
5. **Panel collapsible:** Inicia collapsed (só badge com count). Click expande o chat. Mantém estado collapsed/expanded no store.

## Implementation Plan

### Tasks

- [x] Task 1: Extend `RollResult` interface and `roll()` engine with all modifier modes
  - File: `lib/dice/roll.ts`
  - Action: Add `mode: "normal" | "advantage" | "disadvantage" | "critical" | "resistance"` to `RollResult`. Add `discardedDice: DieResult[]` for the discarded d20 (advantage/disadvantage). Add `resistanceTotal?: number` for the pre-halved total (resistance). Update `roll()` to accept optional `mode` param. Behavior by mode:
    - `"advantage"` (d20 only): roll 2d20, keep highest, put lower in `discardedDice`. `isNat1`/`isNat20` checks the KEPT die.
    - `"disadvantage"` (d20 only): roll 2d20, keep lowest, put higher in `discardedDice`. `isNat1`/`isNat20` checks the KEPT die.
    - `"critical"` (non-d20 only): double the dice count (e.g. `2d6+5` becomes `4d6+5`). Modifier stays the same. Standard 5e critical hit rules.
    - `"resistance"` (non-d20 only): roll normally, then set `resistanceTotal = Math.floor(total / 2)`. The `total` field keeps the full value; `resistanceTotal` is the halved value used for display.
    - `"normal"`: default, no changes.
  - Notes: `parseNotation` stays unchanged. The mode logic lives entirely in `roll()`. Default mode is `"normal"` for backwards compat. If an incompatible mode is passed (e.g. advantage on non-d20), silently fall back to `"normal"`.

- [x] Task 2: Create `dice-history-store.ts` Zustand store
  - File: `lib/stores/dice-history-store.ts` (new)
  - Action: Create store following pinned-cards-store pattern. State: `entries: HistoryEntry[]` (max 50), `isOpen: boolean`, `unreadCount: number`. Actions: `addEntry(result: RollResult)`, `clear()`, `togglePanel()`, `markRead()`. Use `persist` with sessionStorage. Add a `useEffect`-compatible `initDiceHistoryListener()` function that attaches a `window.addEventListener('dice-roll-result', ...)` and returns cleanup. Entry shape: `{ id: string, result: RollResult, timestamp: number }`.
  - Notes: The listener approach keeps the store decoupled from ClickableRoll. The store listens for the CustomEvent, not the other way around.

- [x] Task 3: Extend `ClickableRoll` — Shift/Ctrl detection + event dispatch + tooltip
  - File: `components/dice/ClickableRoll.tsx`
  - Action: In `handleClick`, detect `e.shiftKey` and `e.ctrlKey`/`e.metaKey`. Determine mode contextually using `parseNotation(notation)`:
    - **d20 rolls** (count===1 && sides===20): Shift → `"advantage"`, Ctrl → `"disadvantage"`
    - **Non-d20 rolls** (damage/other): Shift → `"critical"`, Ctrl → `"resistance"`
    Pass the resolved mode to `roll()`. After rolling, dispatch `new CustomEvent('dice-roll-result', { detail: rollResult })` for the history store. Update the button `title` to show contextual hints:
    - d20: `"Roll {notation} — Shift: Vantagem, Ctrl: Desvantagem"`
    - non-d20: `"Roll {notation} — Shift: Crítico (2x dados), Ctrl: Resistência (÷2)"`
    Update `DicePopover` to handle all modes visually:
    - **ADV/DIS**: show both d20 values, discarded one dimmed/struck, "ADV"/"DIS" badge
    - **CRIT**: show "CRIT" badge (red/gold), display doubled dice breakdown
    - **RESIST**: show "RESIST" badge, display both full total and halved total (`"14 → 7"`)
  - Notes: `e.metaKey` catches Cmd on Mac. The context detection is a pure function check on parsed notation — no new props needed.

- [x] Task 4: Create `DiceHistoryPanel` component
  - File: `components/dice/DiceHistoryPanel.tsx` (new)
  - Action: Create a floating panel positioned `fixed bottom-20 right-6` (above OracleFAB). Two states: **collapsed** (small pill showing dice icon + unread count badge) and **expanded** (chat-like panel, ~320px wide, max-h-96, scrollable). Each entry shows: timestamp (HH:MM:SS), label, breakdown, total (with nat1/nat20 coloring), and advantage/disadvantage badge. Auto-scroll to bottom on new entry. Include "Clear" button in header. Use `useDiceHistoryStore` for state. Call `initDiceHistoryListener()` in a `useEffect` on mount.
  - Notes: Style with Tailwind + match the dark 5e theme (bg-[#15151a], border-[#922610], text-[#e8e4d0]). Use `z-index: 9990` (below popover's 9999). On mobile (< md), make it full-width bottom sheet style.

- [x] Task 5: Mount `DiceHistoryPanel` in app layout
  - File: `app/app/layout.tsx`
  - Action: Import and render `<DiceHistoryPanel />` alongside existing global components (OracleFAB, CommandPalette, etc.). Place it inside the ErrorBoundary wrapper.
  - Notes: The panel is self-contained — no props needed.

- [x] Task 6: Add CSS for advantage/disadvantage and history panel
  - File: `styles/stat-card-5e.css`
  - Action: Add styles for: `.dice-adv-badge` / `.dice-dis-badge` (green/red label badges for advantage/disadvantage), `.dice-crit-badge` (gold/red badge for critical), `.dice-resist-badge` (blue badge for resistance), `.dice-discarded` (struck-through, dimmed die value in popover), `.dice-resist-total` (halved total display with arrow), `.dice-history-panel` (panel container), `.dice-history-entry` (individual roll entry in history). Keep consistent with existing 5e dark theme variables.
  - Notes: History panel styles are global (not scoped to `.stat-card-5e`) since it lives outside stat blocks.

### Acceptance Criteria

- [x] AC 1: Given a stat block with a d20 roll (attack, save, check), when the user Shift+clicks the roll, then 2d20 are rolled, the highest is used as the total, and both values are shown in the popover with "ADV" badge and the lower die dimmed/struck.
- [x] AC 2: Given a stat block with a d20 roll, when the user Ctrl+clicks (or Cmd+click on Mac) the roll, then 2d20 are rolled, the lowest is used as the total, and both values are shown with "DIS" badge and the higher die dimmed/struck.
- [x] AC 3: Given a damage roll (e.g. 2d6+5), when the user Shift+clicks, then a critical hit is rolled (4d6+5 — doubled dice count), the popover shows "CRIT" badge and the full breakdown of doubled dice.
- [x] AC 3b: Given a damage roll (e.g. 2d6+5), when the user Ctrl+clicks, then the roll executes normally but the total is halved (rounded down), the popover shows "RESIST" badge and displays both full and halved totals (e.g. "14 → 7").
- [x] AC 4: Given any dice roll from a stat block, when the roll completes, then an entry appears in the history panel with timestamp, label, breakdown, total, and advantage/disadvantage indicator if applicable.
- [x] AC 5: Given the history panel is collapsed, when a new roll occurs, then the unread count badge increments on the collapsed pill.
- [x] AC 6: Given the history panel is expanded, when a new roll occurs, then the panel auto-scrolls to the newest entry and the unread count does not increment.
- [x] AC 7: Given the history panel has entries, when the user clicks "Clear", then all entries are removed.
- [x] AC 8: Given a d20 dice roll button, when the user hovers over it, then a tooltip shows "Shift: Vantagem, Ctrl: Desvantagem". Given a damage dice roll button, when the user hovers, then the tooltip shows "Shift: Crítico (2x dados), Ctrl: Resistência (÷2)".
- [x] AC 9: Given a Nat 20 rolled with advantage, then the total shows green with glow and the history entry is also highlighted green.
- [x] AC 10: Given the history panel with 50+ entries, then the oldest entries are evicted (FIFO) and the panel remains performant.

## Additional Context

### Dependencies

- Nenhuma dependência externa nova. Tudo usa libs já instaladas (Zustand, React, Tailwind).

### Testing Strategy

- **Manual:** Abrir um stat block de monstro, clicar em rolls normais, com Shift, com Ctrl. Verificar popover, history panel, collapse/expand, auto-scroll, clear, badge count.
- **Edge cases manuais:** Clicar rápido em sequência, Shift+click em d20 (vantagem) vs Shift+click em dano (crítico) — verificar modos contextuais, Ctrl+click em dano (resistência) com total ímpar (arredondamento pra baixo), verificar que history persiste durante navegação entre páginas (sessionStorage), refresh limpa o histórico.

### Notes

- **Risco:** O `DiceHistoryPanel` usa position fixed bottom-right — pode colidir com o `OracleFAB` em mobile. Mitigação: posicionar acima do FAB (`bottom-20`) e testar em viewports pequenos.
- **Futuro:** O history panel é a base natural para: compartilhamento de rolls com jogadores, rolls persistentes no combat log, e integração com o combat tracker (log de ações por turno).
- **Performance:** 50 entries é um cap seguro. Cada entry é ~200 bytes. SessionStorage tem 5MB de limite. Sem risco.

## Review Notes

- Adversarial review completo
- Findings: 13 total, 9 corrigidos, 4 skipped (1 noise, 3 by-design/out-of-scope)
- Abordagem de resolução: auto-fix
- Fixes aplicados: race condition em togglePanel (F1), SSR guard (F2), persist version (F4), dice[0] guard (F5), unreadCount cap (F6), randomUUID fallback (F8), markRead double-trigger (F10), negative resistance clamp (F11), structuredClone no event (F13)
- Skipped: guest mode (F3 — fora do escopo), silent fallback (F7 — by design), z-index (F9 — segue padrão existente), isNat noise (F12)
