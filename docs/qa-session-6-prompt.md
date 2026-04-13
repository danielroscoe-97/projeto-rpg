# QA Session 6 — Full E2E Re-run + Remaining Fails Investigation

## O que aconteceu na Session 5

Corrigimos selectors em **9 spec files** (30+ corrections) e rodamos 8 specs. Resultado:

| Spec | Antes (S4) | Depois (S5) | Status |
|------|-----------|-------------|--------|
| J2 player-join | 4/4 | **4/4** | PASS |
| J6 combat-core-loop | 0/4 | **4/4** | **FIXED** |
| J9 dm-vs-player-visibility | 2/5 | **5/5** | **FIXED** |
| J14 i18n-journeys | ?/7 | **7/7** | PASS |
| J19 player-combat-actions | 7/15 | **9/15** (5 skip, 1 fail) | +2 |
| J20 player-communication | 2/13 | **5/13** (5 skip, 3 fail) | +3 |
| J21 player-ui-panels | 7/18 | **11/18** (4 skip, 3 fail) | +4 |
| J22 player-resilience | 0/15 | **13/15** (2 fail) | **+13** |

**+29 testes corrigidos. 4 specs 100% pass. 0 regressoes.**

### Commits feitos na Session 5:
- `caf239c` — fix(e2e): correct selectors across 8 specs
- `424db0a` — fix(e2e): J15 compendium search + HP adjuster selector

---

## Ambiente

```bash
# Dev server (precisa estar rodando na porta 3111)
npm run dev  # porta 3111

# Comando base
BASE_URL=http://localhost:3111 npx playwright test <spec> --project=desktop-chrome --reporter=line

# REGRA ABSOLUTA: NUNCA rodar 2+ auth specs em paralelo
# O Supabase GoTrue rate-limita — limite foi aumentado pra 300/5min mas cuidado
# Specs guest (sem auth) podem rodar em paralelo sem limite
```

---

## Specs que passam 100% (nao mexer)

| Spec | Tests | Status |
|------|-------|--------|
| guest-desktop-journey | 16/16 | PASS |
| guest-mobile-journey | 14/14 | PASS |
| j1-first-combat | 4/4 | PASS |
| j2-player-join | 4/4 | PASS |
| j6-combat-core-loop | 4/4 | PASS |
| j7-compendium-oracle | 9/9 | PASS |
| j8-try-full-funnel | 6/6 | PASS |
| j9-dm-vs-player-visibility | 5/5 | PASS |
| j14-i18n-journeys | 7/7 | PASS |
| j18-compendium-full | 22/22 | PASS |
| lair-actions | 8/8 | PASS |
| onboarding/sprint1-token-survival | 8/9 | ~PASS |

---

## FASE 1 — Investigar os 13 fails restantes dos J19-J22

### J19 — 1 fail restante

| Test | Erro | O que investigar |
|------|------|-----------------|
| J19.B4 — HP offline | `context.setOffline(true)` nao propaga pro connectionStatus do Supabase channel | O componente checa `connectionStatus !== "connected"` (prop do parent). O Playwright offline mode corta rede mas o Supabase channel pode nao detectar imediatamente. Aumentamos wait pra 10s mas nao foi suficiente. **Opcao**: verificar se o componente tem um listener de `navigator.onLine` ou se precisa de outro approach (mock do connectionStatus via evaluate) |

### J20 — 3 fails restantes

| Test | Erro | O que investigar |
|------|------|-----------------|
| J20.B2 — Postit auto-dismiss 15s | DM postit enviou mas toast no player nao apareceu OU nao dismissou | Verificar se `dm-postit-toast` aparece. O DmPostitSender envia via broadcast — verificar se o canal esta correto. Auto-dismiss = 15s (DISMISS_MS no DmPostit.tsx) |
| J20.B3 — Postit history | Depende de B2 funcionar | Fix B2 primeiro |
| J20.C2 — Inline note send | Player encontrou o input (`player-note-input-`) mas algo falhou no send ou na confirmacao | Verificar se `player-note-send-` button click funciona, e se o button text muda pra "Sent"/"Enviado" ou se o input limpa |

### J21 — 3 fails restantes

| Test | Erro | O que investigar |
|------|------|-----------------|
| J21.B4 — Spell slot persist reload | Spell slots precisam de campaign character — test join via token nao tem character com spell slots | Provavelmente precisa skip graceful se spell slots nao encontrados. Verificar se o test ja tem skip gate |
| J21.C1 — Bottom bar mobile | Mobile viewport (393x851) com `isMobile: true` — o `playerJoinCombat` helper pode ter issues com mobile (Rule 6: mobile fill bug) | Verificar se o login/join funciona com mobile context. Rule 6 diz "usar desktop pra setup" |
| J21.C2 — Bottom bar HP | Depende de C1 funcionar | Fix C1 primeiro |

### J22 — 2 fails restantes

| Test | Erro | O que investigar |
|------|------|-----------------|
| J22.B2 — Browser close + rejoin | Fecha todo o context (perde storage), abre novo, vai pro join URL. Espera ver rejoin button ou lobby | O `localStorage` se perde quando fecha context. O test espera que o server-side tenha o player registrado e mostre rejoin. Verificar se a lista de nomes (L4 da cadeia de fallbacks) funciona |
| J22.B3 — Rejoin flow character select | Depende de B2 | Fix B2 primeiro |

---

## FASE 2 — Rodar specs que NUNCA rodaram (prioridade)

### Player View dedicados (nao rodaram ainda)

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **player-view.spec.ts** | 7 | ALTA — player view dedicado |
| **j11-player-view-complete** | ~10 | ALTA — cobertura completa |
| **player-mobile.spec.ts** | ~5 | MEDIA — mobile player |
| **j12-combat-resilience** | 5 | ALTA — reconexao |
| **multi-player-stress** | 23 | ALTA — multi-player |

### Grandes specs nunca rodados

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **j15-comprehensive-qa-sweep** | 54 | ALTA — ja fixamos selectors, precisa rodar |
| **j16-full-platform-walkthrough** | 30 | ALTA — ja fixamos selectors, precisa rodar |
| **campaign/mind-map** | 47 | ALTA — maior suite |
| **j10-free-all-features** | ~10 | MEDIA |
| **j13-mobile-all-journeys** | ~10 | MEDIA |
| **j3-dm-returns** | 4 | MEDIA |
| **j5-share-link** | 2 | BAIXA |

### Audio + Features

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **j17-sprint-audio** | 16 | MEDIA |
| **audio** (4 specs) | 12 | MEDIA |
| **active-effects** (2 specs) | 8 | MEDIA |
| **onboarding/dashboard-tour** | 6 | MEDIA |

### Adversarial (10 specs)

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **adversarial batch 1** (5 specs) | 21 | MEDIA |
| **adversarial batch 2** (5 specs) | 17 | MEDIA |

### Outros

| Spec | Tests | Prioridade |
|------|-------|-----------|
| **session-create** | 5 | MEDIA |
| **turn-advance** | 3 | MEDIA |
| **visual-regression** | 7 | BAIXA (rodar com --update-snapshots) |
| **load-test** | ? | BAIXA |
| **qa-login-check** | ? | BAIXA |

---

## Fixes globais ja aplicados (nao repetir)

Estes patterns ja foram corrigidos em TODOS os specs:
- `condition-btn-` → `conditions-btn-` (plural, com s)
- `hp-adjust-value` → `hp-amount-input`
- `input[type="number"]` em HP context → `[data-testid="hp-amount-input"]` como primeiro selector
- Heal sem mode toggle → precisa clicar `[data-testid="hp-mode-heal"]` antes
- `condition-toggle-{name}` e `condition-close-btn` para ConditionSelector

---

## 10 Regras de Correcao (sessoes 1-5)

1. **Minimo 2 combatentes**: `combatants.length >= 2` pra habilitar "Iniciar Combate"
2. **Manual form toggle**: Clicar `button:has-text(/Manual/i)` antes de preencher `add-row-name`
3. **`encounter-name-input` removido**: Nome auto-gerado, remover qualquer fill
4. **Tour modal bloqueia**: Usar `skipGuidedTour(page)` + `page.reload()`
5. **Post-combat flow**: UI pode mostrar leaderboard OU recap — aceitar ambos
6. **Mobile fill bug**: `page.fill()` com isMobile nao persiste — usar desktop pra setup
7. **context.close()**: Sempre `.catch(() => {})` no Windows
8. **NUNCA 2+ auth specs em paralelo**: GoTrue rate-limita (limite: 300/5min agora)
9. **conditions-btn- (plural)**: O testid do botao de condicao e `conditions-btn-{id}`, NAO `condition-btn-{id}`
10. **HP adjuster tem mode toggle**: Pra curar, clicar `hp-mode-heal` ANTES de preencher `hp-amount-input` e clicar `hp-apply-btn`

---

## Plano de Acao Sugerido

### Fase 1 — Investigar 13 fails restantes (J19-J22)
1. J19.B4 — offline test (1 fail)
2. J20.B2/B3 — DM postit (2 fails)
3. J20.C2 — inline note (1 fail)
4. J21.B4 — spell slot persist (1 fail)
5. J21.C1/C2 — mobile bottom bar (2 fails)
6. J22.B2/B3 — browser close rejoin (2 fails)

### Fase 2 — Rodar player view specs nunca rodados
7. player-view.spec.ts (7 tests)
8. j11-player-view-complete
9. j12-combat-resilience (5 tests)
10. player-mobile.spec.ts
11. multi-player-stress (23 tests) — ISOLADO

### Fase 3 — Rodar grandes specs fixados
12. j15-comprehensive-qa-sweep (54 tests) — ISOLADO
13. j16-full-platform-walkthrough (30 tests) — ISOLADO
14. campaign/mind-map (47 tests) — ISOLADO

### Fase 4 — Audio + Adversarial + Resto
15. j17-sprint-audio + audio specs
16. j10, j13, j3, j5
17. Adversarial batch 1 e 2
18. Visual regression com --update-snapshots

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
- GoTrue rate limit: 300/5min (aumentado na Session 5)

---

## Key Data-TestIDs dos Componentes

```
# DM Combat View (CombatSessionClient.tsx)
active-combat, next-turn-btn, end-encounter-btn
hp-btn-{id}, hp-adjuster, hp-amount-input, hp-apply-btn
hp-mode-damage, hp-mode-heal, hp-mode-temp
conditions-btn-{id}, condition-selector, condition-toggle-{name}, condition-close-btn
dm-postit-btn-{name}, dm-postit-input-{name}, dm-postit-send-{name}
add-row-name, add-row-hp, add-row-ac, add-row-init, add-row-btn

# Player Join/Lobby
lobby-name, lobby-initiative, lobby-hp, lobby-ac, lobby-submit
rejoin-{name}, character-select-{id}

# Player Combat View (PlayerInitiativeBoard.tsx)
player-view, player-initiative-board, sticky-turn-header
player-combatant-{id}, own-character-{id}
player-end-turn-btn, player-action-log-btn
notification-toggle (localStorage: turn_notifications_disabled)

# HP Actions (PlayerHpActions.tsx)
(buttons com texto Damage/Dano, Heal/Curar, Temp — sem data-testid)
(input: inputmode="numeric", pattern="[0-9]*")

# Death Saves (DeathSaveTracker.tsx)
death-save-tracker, death-save-success-btn, death-save-failure-btn
death-save-success-{0,1,2}, death-save-failure-{0,1,2}
death-save-dead, death-save-stabilized

# Chat (PlayerChat.tsx)
player-chat-btn, player-chat-panel, player-chat-input, player-chat-send, player-chat-badge

# DM Postit (DmPostit.tsx — player side)
dm-postit-toast, dm-postit-history-btn, dm-postit-history-panel

# Notes
player-note-input-{id}, player-note-send-{id}
player-notes-btn, player-notes

# Compendium (CommandPalette.tsx — cmdk)
player-oracle-btn, player-oracle
[cmdk-input] (search input attribute)

# Notifications
turn-now-overlay (role="alertdialog", auto-dismiss 3s)
turn-upcoming-banner, push-notification-toggle

# Connection
sync-indicator, dm-offline-banner
reconnecting-skeleton, session-revoked-banner

# Bottom Bar (mobile — PlayerBottomBar.tsx)
player-bottom-bar-{id} (lg:hidden — only visible on mobile)

# Spell Slots (SpellSlotTracker.tsx)
role="checkbox" aria-checked (NO data-testid on dots)
Long Rest button: aria-label with spell_slots_long_rest translation

# HP Tiers (hp-status.ts)
FULL: bg-emerald-400 | LIGHT: bg-green-500 | MODERATE: bg-amber-400
HEAVY: bg-red-500 | CRITICAL: bg-red-900

# Round Number (PlayerInitiativeBoard.tsx)
Displays as "R{roundNumber}" (compact), aria-label="Rodada {n}"
```
