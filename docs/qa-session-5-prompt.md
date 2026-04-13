# QA Session 5 — Player Specs Fix + Full E2E Re-run

## O que aconteceu na Session 4

Rodamos 302 testes de 57 spec files. Criamos 4 novos specs (J19-J22) cobrindo toda a visao do jogador. **193/302 passaram (64%)**. O Supabase GoTrue rate-limitou nosso IP apos ~150 logins, bloqueando todos os auth specs.

---

## Ambiente

```bash
# Dev server (precisa estar rodando na porta 3111)
npm run dev  # porta 3111

# Comando base
BASE_URL=http://localhost:3111 npx playwright test <spec> --project=desktop-chrome --reporter=line

# REGRA ABSOLUTA: NUNCA rodar 2+ auth specs em paralelo
# O Supabase GoTrue rate-limita apos ~50 logins consecutivos
# Specs guest (sem auth) podem rodar em paralelo sem limite
```

---

## Estado Atual — Specs que passam 100% (nao mexer)

| Spec | Tests | Status |
|------|-------|--------|
| guest-desktop-journey | 16/16 | PASS |
| guest-mobile-journey | 14/14 | PASS |
| j1-first-combat | 4/4 | PASS |
| j2-player-join | 4/4 | PASS |
| j7-compendium-oracle | 9/9 | PASS |
| j8-try-full-funnel | 6/6 | PASS |
| j18-compendium-full | 22/22 | PASS |
| lair-actions | 8/8 | PASS |
| onboarding/sprint1-token-survival | 8/9 | ~PASS |

---

## Specs Novos (J19-J22) — Precisam de Fix nos Testes

Estes specs foram criados para cobrir TODA a visao do jogador em combate. Muitos testes falharam porque os selectors/interacoes nao batem com o app real. Precisa investigar cada fail e corrigir o TESTE (nao o app, a menos que encontre bug real).

### J19 — Player Combat Actions (7/15 pass, 5 fail, 3 skip)

**Passaram:** A1 (end turn visible), A2 (end turn click), B1 (HP buttons visible), B2 (self-damage), C1 (death save UI), C2 (death save success), E3 (sync indicator)

**Falharam — investigar e corrigir:**
| Test | Erro Provavel | O que fazer |
|------|--------------|-------------|
| J19.B3 — Player reports self-heal | Selector ou popover nao encontrado | Investigar PlayerHpActions.tsx — o heal button pode ter texto/testid diferente |
| J19.B4 — HP actions disabled offline | `setOffline(true)` pode nao afetar os buttons | Verificar se offline state desabilita buttons ou se precisa checar de outra forma |
| J19.C3 — Death save failure | Similar a C2 que passa — pode ser timing | Comparar com C2, aumentar timeout ou ajustar selector |
| J19.E1 — Turn notification overlay | `turn-now-overlay` pode nao aparecer no playwright | O overlay usa `role="alertdialog"` — verificar se aparece ou se auto-dismiss e rapido demais |
| J19.E2 — Notification toggle persist | Reload pode perder o estado | Verificar localStorage key `turn_notifications_disabled` |

### J20 — Player Communication (2/13 pass, 9 fail, 2 skip)

**Passaram:** A1 (chat button visible), provavelmente B1 ou C1

**Falharam — investigar e corrigir:**
| Test | Erro Provavel | O que fazer |
|------|--------------|-------------|
| J20.A2 — Send chat message | Chat panel abriu mas send falhou | Verificar `player-chat-input` e `player-chat-send` testids existem |
| J20.A3 — Chat cross-player | Multi-context + realtime | Verificar se broadcast funciona entre 2 players, aumentar timeout pra 15s |
| J20.A4 — Unread badge | Badge pode nao incrementar sem realtime | Verificar `player-chat-badge` testid |
| J20.A5 — Rate limiting | Pode nao bloquear visualmente | Verificar se button fica disabled ou se precisa outra assertion |
| J20.B2 — Postit auto-dismiss | DM postit pode nao ter sido enviado com sucesso em B1 | Investigar como DM envia postit — encontrar o UI correto |
| J20.B3 — Postit history | Depende de B1/B2 | Serial dependency |
| J20.C3 — DM sees note | Propagacao pode ser lenta | Aumentar timeout pra 15s |
| J20.D1 — Shared notes button | `player-notes-btn` pode nao existir sem campaign | Verificar se precisa de campaign context |
| J20.D2 — Shared notes content | Depende de D1 | Serial dependency |

### J21 — Player UI Panels (7/18 pass, 9 fail, 2 skip)

**Passaram:** A1 (compendium button), A2 (compendium open), A4 (compendium close), B1 (spell slot visibility — skip graceful), C2 (bottom bar HP), C3 (bottom bar desktop hidden), D1 (sync indicator), D2 (sync network loss)

**Falharam — investigar e corrigir:**
| Test | Erro Provavel | O que fazer |
|------|--------------|-------------|
| J21.A3 — Compendium search | Search input pode ter testid diferente | Verificar dentro do `player-oracle` panel qual e o input |
| J21.B2 — Spell slot toggle | Skip provavel (sem campaign char) | Verificar se skip funciona ou se esta falhando ao inves de skipping |
| J21.B3 — Long Rest | Depende de B2 | Serial dependency |
| J21.C1 — Bottom bar mobile | Mobile viewport pode nao estar correto | Verificar viewport config e se `player-bottom-bar-*` aparece |
| J21.D3 — DM offline badge | DM stale detection = 15s polling, teste pode precisar esperar mais | Aumentar timeout pra 90s ou skip se nao implementado |
| J21.E1 — HP tier colors | CSS classes podem ser diferentes | Investigar quais classes o PlayerInitiativeBoard usa pra HP tiers |
| J21.E2 — Defeated display | DM defeat button pode ter selector diferente | Investigar como DM derrota combatente |
| J21.E3 — Round number | Round indicator pode ter formato diferente | Grep por "Round\|Rodada" no PlayerInitiativeBoard |
| J21.E4 — DM-only controls hidden | Assertion pode estar procurando o selector errado | Verificar se `next-turn-btn` realmente nao aparece na player view |

### J22 — Player Resilience (0/15 — NUNCA rodou isolado com auth funcionando)

**Nenhum rodou com sucesso** — sempre foi bloqueado por auth rate limit. Precisa rodar isolado quando auth funcionar.

**Se falhar com auth OK, investigar:**
| Test | O que verificar |
|------|----------------|
| J22.A1-A3 — Page refresh | `playerPage.reload()` + esperar `player-view` — pode precisar de timeout maior |
| J22.B1-B3 — Tab close/reopen | Verificar se localStorage persiste corretamente |
| J22.C1-C3 — Network loss | `context.setOffline()` pode nao funcionar como esperado no Windows |
| J22.D1-D2 — Session end | Encontrar o botao correto de "End Combat" no DM |
| J22.D3 — Late join | playerJoinCombat apos DM avancar turns |
| J22.D4 — Navigate away/back | Verificar se `/join/[token]` reconecta sem re-registro |
| J22.E1-E2 — Visibility change | `Object.defineProperty(document, 'visibilityState')` pode nao funcionar em Chromium |

---

## Specs Existentes com Failures — Precisam de Investigacao

### Alta Prioridade (muitos testes)

| Spec | Result | Problema |
|------|--------|----------|
| **J15** comprehensive-qa-sweep | 27/54 | 27 fails — mix de selector changes + auth pages + combat actions |
| **J16** full-platform-walkthrough | 9/30 | Blocos B/C/E (player + realtime) falharam em cascata |
| **J6** combat-core-loop | 0/4 | Selectors de combat actions (dano, condicao, cura) mudaram |
| **J9** dm-vs-player-visibility | 2/5 | Realtime propagacao ou selectors |

### Media Prioridade

| Spec | Result | Problema |
|------|--------|----------|
| features (active-effects + audio) | 2/8 | Active effects precisa campaign, audio precisa audio popover |
| adversarial batch 1 | 7/21 | Setup cascade — 1 fail no setup = 10 did-not-run |
| visual regression | 2/7 | Snapshots desatualizados — rodar com `--update-snapshots` |

### Nunca Rodaram (auth rate limited)

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **campaign/mind-map** | 47 | ALTA — maior suite |
| **multi-player-stress** | 23 | ALTA — testa multi-player |
| **J17** sprint-audio | 16 | MEDIA |
| **audio** (4 specs) | 12 | MEDIA |
| **onboarding/dashboard-tour** | 6 | MEDIA |
| **J12** combat-resilience | 5 | ALTA — testa reconexao |
| **J3** dm-returns | 4 | MEDIA |
| **J5** share-link | 2 | BAIXA |
| **session-create** | 5 | MEDIA |
| **player-join** | 2 | BAIXA (J2 cobre) |
| **player-view** | 7 | MEDIA (J19/J21 cobrem parcial) |
| **turn-advance** | 3 | MEDIA |
| **adversarial batch 2** | 17 | MEDIA |
| **load-test** | ? | BAIXA |
| **J10, J11, J13, J14** | 29 | MEDIA — re-run isolados |

---

## 8 Regras de Correcao (sessoes 1-4)

1. **Minimo 2 combatentes**: `combatants.length >= 2` pra habilitar "Iniciar Combate"
2. **Manual form toggle**: Clicar `button:has-text(/Manual/i)` antes de preencher `add-row-name`
3. **`encounter-name-input` removido**: Nome auto-gerado, remover qualquer fill
4. **Tour modal bloqueia**: Usar `skipGuidedTour(page)` + `page.reload()`
5. **Post-combat flow**: UI pode mostrar leaderboard OU recap — aceitar ambos
6. **Mobile fill bug**: `page.fill()` com isMobile nao persiste — usar desktop pra setup
7. **context.close()**: Sempre `.catch(() => {})` no Windows
8. **NUNCA 2+ auth specs em paralelo**: GoTrue rate-limita apos ~50 logins

---

## Plano de Acao Sugerido

### Fase 1 — Fix J19-J22 (novos specs, selectors errados)
1. Investigar cada fail de J19 (5 tests) — comparar selectors com componentes reais
2. Investigar cada fail de J20 (9 tests) — chat/postit/notes selectors
3. Investigar cada fail de J21 (9 tests) — compendium search/HP tiers/defeated
4. Rodar J22 pela primeira vez com auth funcionando

### Fase 2 — Re-run specs nunca rodados
5. Campaign mind-map (47 tests) — ISOLADO
6. Multi-player-stress (23 tests) — ISOLADO
7. J10, J11, J13, J14 — um por vez
8. J12 combat-resilience — ISOLADO

### Fase 3 — Fix specs existentes com failures reais
9. J6 combat-core-loop — verificar selectors de combat actions
10. J15 — triagem dos 27 fails (quais sao bugs reais vs test bugs)
11. J16 — fix blocos B/C/E
12. Visual regression — `--update-snapshots`

### Fase 4 — Audio + Campaign
13. Audio specs (4 files) — investigar audio popover selectors
14. J17 sprint-audio
15. Onboarding dashboard-tour

---

## Helpers Uteis

```typescript
// e2e/helpers/session.ts
dmSetupCombatSession(page, account, combatants[]) // DM login + setup + start combat
playerJoinCombat(playerPage, dmPage, token, name, opts) // Player join + DM accept
goToNewSession(page) // Navigate to /app/session/new

// e2e/helpers/auth.ts
loginAs(page, account) // Login via UI
loginAsDM(page, account) // Alias DM login

// e2e/guest-qa/helpers.ts
skipGuidedTour(page) // Skip tour via localStorage
addManualCombatant(page, combatant) // Add via manual form
startCombat(page) // Click start + dismiss overlays
STANDARD_ENCOUNTER // 4 combatants preset
QUICK_ENCOUNTER // 2 combatants preset

// e2e/fixtures/test-accounts.ts
DM_PRIMARY, DM_PRO, DM_ENGLISH
PLAYER_WARRIOR, PLAYER_MAGE, PLAYER_HEALER, PLAYER_ENGLISH
```

## Contas de Teste

- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Supabase: projeto `mdcmjpcjkqgyxvhweoqs` (producao)

---

## Key Data-TestIDs dos Componentes Player

```
# Player Join/Lobby
lobby-name, lobby-initiative, lobby-hp, lobby-ac, lobby-submit
rejoin-{name}, character-select-{id}

# Player Combat View
player-view, player-initiative-board, sticky-turn-header
player-combatant-{id}, own-character-{id}
player-end-turn-btn, player-action-log-btn

# HP Actions
(buttons com texto Damage/Dano, Heal/Curar, Temp)

# Death Saves
death-save-success-btn, death-save-failure-btn

# Chat
player-chat-btn, player-chat-panel, player-chat-input, player-chat-send, player-chat-badge

# DM Postit
dm-postit-toast, dm-postit-history-btn, dm-postit-history-panel

# Notes
player-note-input-{id}, player-note-send-{id}
player-notes-btn, player-notes

# Compendium
player-oracle-btn, player-oracle

# Notifications
turn-now-overlay, turn-upcoming-banner, notification-toggle
push-notification-toggle

# Connection
sync-indicator, dm-offline-badge, dm-offline-banner
reconnecting-skeleton, session-revoked-banner

# Bottom Bar (mobile)
player-bottom-bar-{id}
```
