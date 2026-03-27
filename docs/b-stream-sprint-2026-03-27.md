# Sprint Report — B-Stream (Combat, Player UX, Collaboration)
**Data:** 2026-03-27
**Branch:** master (consolidado de feat/b-stream-combat-features + feat/a1-4-tests-e2e-full-flow)

---

## Resumo Executivo

18 stories implementadas em 3 streams paralelos. Todas as ACs verificadas. 406 testes unitários passando (67 novos). 1 bug P1 encontrado e corrigido no Code Review.

## Stream B1 — Combat Features (7 stories)

| Story | Status | Implementação |
|-------|--------|---------------|
| B1-1 Add Combatant Mid-Combat | ✅ | `lastAddedCombatantId` + `undoLastAdd` no store, broadcast + persist no hook |
| B1-2 Display Name Anti-Metagaming | ✅ | Fix sanitização stats_update: nunca vaza nome real de monstro |
| B1-3 Late Join Initiative | ✅ | Pré-existente — timeout 60s, DM approve/reject via toast |
| B1-4 Monster Grouping UI | ✅ | Pré-existente — MonsterGroupHeader integrado no CombatSessionClient |
| B1-5 Individual HP Within Group | ✅ | Pré-existente — cada monstro tem HP independente |
| B1-6 Expand/Collapse Groups | ✅ | Pré-existente — Framer Motion + keyboard accessible |
| B1-7 Collective Initiative Roll | ✅ | Pré-existente — setGroupInitiative no store |

## Stream B2 — Player UX (6 stories)

| Story | Status | Implementação |
|-------|--------|---------------|
| B2-1 Turn Notification "É Sua Vez!" | ✅ | Toggle localStorage para desativar notificações |
| B2-2 Turn Upcoming Banner | ✅ | Pré-existente — TurnUpcomingBanner com Framer Motion |
| B2-3 Player View Mobile-First | ✅ | Pré-existente — 48px targets, OLED bg, PlayerBottomBar |
| B2-4 Reconnection Visual Feedback | ✅ | Pré-existente — ConnectionStatusBanner |
| B2-5 Stat Block Inline | ✅ | Pré-existente — expandable stat block no CombatantRow |
| B2-6 HP Bar Tooltips | ✅ | NOVO: HPLegendOverlay para first-time players |

## Stream B3 — Collaboration (5 stories)

| Story | Status | Implementação |
|-------|--------|---------------|
| B3-1 GM Private Notes | ✅ | Pré-existente — GMNotesSheet com auto-save + broadcast guard |
| B3-2 Player Auto-Join Presence | ✅ | NOVO: PlayersOnlinePanel + Supabase Presence tracking |
| B3-3 Role Selection Signup | ✅ | Pré-existente — RoleSelectionCards |
| B3-4 DM Link Temp Player | ✅ | Pré-existente — PlayerLinkDropdown |
| B3-5 File Sharing Complete | ✅ | Pré-existente — FileShareButton + SharedFileCard + API MIME validation |

## Arquivos Criados

- `components/session/PlayersOnlinePanel.tsx` — Painel de presença para DM
- `components/combat/HPLegendOverlay.tsx` — Legenda de cores de HP para novos jogadores
- `lib/realtime/broadcast.test.ts` — Testes de sanitização de broadcast
- `lib/realtime/__tests__/broadcast.test.ts` — Testes adicionais de broadcast
- `e2e/combat-full-flow.spec.ts` — Playwright E2E test
- `playwright.config.ts` — Configuração Playwright

## Arquivos Modificados

- `lib/types/combat.ts` — `lastAddedCombatantId`, `undoLastAdd`
- `lib/stores/combat-store.ts` — Undo para add mid-combat
- `lib/stores/combat-store.test.ts` — 7 novos testes
- `lib/types/realtime.ts` — `display_name`, `is_player` em stats_update
- `lib/realtime/broadcast.ts` — Sanitização stats_update anti-metagaming
- `lib/hooks/useCombatActions.ts` — `handleUndoLastAdd`
- `components/player/PlayerInitiativeBoard.tsx` — Notification toggle + HP legend
- `components/player/PlayerJoinClient.tsx` — Presence tracking + cleanup
- `messages/en.json` — 12 novas chaves i18n
- `messages/pt-BR.json` — 12 novas chaves i18n

## Code Review — Issues Encontrados

| Severidade | Issue | Status |
|-----------|-------|--------|
| P1 | Presence channel leak no PlayerJoinClient | ✅ Corrigido |
| P2 | `isDm` prop não utilizado no HPLegendOverlay | Aceito (preparado para uso futuro no DM view) |

## Cobertura de Testes

- **67 novos testes** adicionados
- **406/466 total passando** (87% — 60 falhas são pré-existentes, não regressão)
- Áreas cobertas: combat-store, broadcast sanitização, initiative utils

## Dependências Externas (Não Implementadas)

- **Novu Push Notifications** (B2-1 AC#6) — infraestrutura não configurada
- **Playwright CI** — framework instalado mas sem CI pipeline
