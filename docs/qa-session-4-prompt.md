# QA Session 4 — Prompt Completo

## O que estamos fazendo

**Stress testing do app via e2e tests.** Rodamos TODOS os 54 spec files do Playwright, e quando um teste falha, investigamos:
- **Bug no APP?** → Corrige o app, commita, deploya
- **Bug no TESTE?** → Corrige o teste, commita, deploya

O objetivo e ter o maximo de testes passando, corrigindo tanto o app quanto os testes conforme necessario.

---

## Ambiente

```bash
# Dev server (precisa estar rodando na porta 3111)
npm run dev  # porta 3111

# Comando base
BASE_URL=http://localhost:3111 npx playwright test <spec> --project=desktop-chrome --reporter=line

# IMPORTANTE: NAO rodar mais que 2-3 specs em paralelo — o dev server Windows sobrecarrega
```

---

## Estado Atual — O que ja passa (~225 tests)

### Sessoes anteriores (~130 tests)
J1(4), J2(4), J6(4), J8(6), J9(5), J11(6), J13(3/6), J14(7), a11y(6), auth(all), turn-advance(3), guest-desktop(16), guest-mobile(14), adversarial(38), load-test(all)

### Sessao 3 — novos (~95 tests)
| Spec | Resultado | Status |
|------|-----------|--------|
| J7 compendium-oracle | **9/9 PASS** | DONE |
| lair-actions (guest) | **8/8 PASS** | DONE |
| player-join | **2/2 PASS** | DONE |
| player-view | **7/7 PASS** | DONE |
| visitor (3 files) | **29/30** (1 skip) | DONE |
| J10 free-features | **8/10** | J10.1 + J10.10 timeout |
| J3 dm-returns | **3/4** | J3.2 session resume |
| session-create | **3/5** | 1 fixed, 1 timeout |
| i18n | **2/4** (2 skip) | DONE |
| J5 share-link | **1/2** | J5.3 player join timeout |
| j17 sprint-audio | **3/16** | Audio tests falhando |
| onboarding | **3/15** | Dashboard tour issues |
| features | **1/5** (1 skip) | audio-broadcast fail |
| j18 compendium-full | **0/22** | waitForSrdReady timeout |
| audio (3 files) | **0/12** (4 skip) | All auth-flow fail |
| J12 resilience | **0/5** | page.goto timeout |
| multi-player-stress | **0/23** | getShareToken null |
| campaign mind-map | **2/47** | goToCampaign timeout |

---

## O que falta rodar (nunca rodou)

| Spec | Tests | Fixes ja aplicados? |
|------|-------|---------------------|
| **j15** comprehensive-qa-sweep | 54 | Sim — min 2 combatants, encounter-name-input, .close().catch |
| **j16** full-platform-walkthrough | 30 | Sim — min 2 combatants, encounter-name-input, .close().catch |
| **visual-regression** | ? | Nao investigado |

---

## 5 Problemas Reais para Investigar e Corrigir

### 1. `getShareToken()` retorna null (BLOQUEIA 23+ tests)
**Onde:** `e2e/helpers/session.ts` → `getShareToken()`
**Fluxo:** share-prepare-btn → share-session-generate → share-session-url
**Sintoma:** Combat inicia OK (screenshot mostra 4 combatentes ativos), mas token e null
**Afeta:** multi-player-stress (23 tests, serial — setup fail = 22 did not run), J5.3
**Investigar:** Verificar se os data-testid `share-prepare-btn`, `share-session-generate`, `share-session-url` ainda existem no app. O share flow pode ter mudado.

### 2. `waitForSrdReady` timeout no helper guest-qa (BLOQUEIA 22 tests)
**Onde:** `e2e/guest-qa/helpers.ts:59` → `waitForSrdReady()`
**Sintoma:** `data-testid="srd-status"` com `data-ready="true"` nunca aparece
**Mas:** lair-actions (8/8 PASS) usa `waitForSrdReady` de `e2e/helpers/combat.ts` e funciona
**Afeta:** j18 (22 tests)
**Investigar:** Comparar os 2 helpers. Verificar se `srd-status` testid existe no GuestCombatClient.

### 3. Audio tests falhando (12 tests)
**Onde:** `e2e/audio/audio-upload.spec.ts`, `dm-controls.spec.ts`, `soundboard.spec.ts`
**Sintoma:** DM session setup fail + audio popover/controls nao encontrados
**Afeta:** audio (12 tests), j17 (13/16 fails parciais)
**Investigar:** Verificar se os selectors de audio controls (popover, FAB, volume slider) mudaram.

### 4. Dashboard tour selectors (12 tests)
**Onde:** `e2e/onboarding/dashboard-tour.spec.ts`
**Sintoma:** `data-tour-id` selectors nao encontrados
**Afeta:** onboarding (12/15 fails)
**Investigar:** Verificar se `data-tour-id="dash-overview"` etc ainda existem nos componentes do dashboard.

### 5. `page.goto` timeout em SSR autenticado (5 tests)
**Onde:** `e2e/helpers/session.ts:11` → `goToNewSession()`
**Sintoma:** `page.goto("/app/session/new")` timeout mesmo com `waitUntil: "domcontentloaded"` + 45s
**Fix aplicado:** Mudou de `waitUntil: "load"` (default) para `"domcontentloaded"` + 45s timeout
**Afeta:** J12 (5 tests)
**Investigar:** Se J12 continua falhando, pode ser que o SSR do Next.js nessa rota e muito lento. Verificar se ha data fetching blocking no server component.

---

## 8 Regras de Correcao (aprendidas nas sessoes 1-3)

1. **Minimo 2 combatentes**: `EncounterSetup.tsx` exige `combatants.length >= 2` para habilitar "Iniciar Combate". Se um teste cria apenas 1 combatente, adicionar um segundo dummy.

2. **Manual form toggle**: O form manual em `MonsterSearchPanel` fica colapsado. Testes devem clicar `button:has-text(/Manual/i)` antes de preencher `[data-testid="add-row-name"]`.

3. **`encounter-name-input` removido**: Nome do encontro e auto-gerado. Remover qualquer `page.fill('[data-testid="encounter-name-input"]', ...)`.

4. **Tour modal bloqueia**: Testes no `/try` ou dashboard podem ter tour modal. Usar `skipGuidedTour(page)` de `e2e/guest-qa/helpers.ts` + `page.reload()`.

5. **`setup-row-` count**: Usar `[data-testid^="setup-row-"]` para contar combatentes adicionados.

6. **Post-combat flow**: Apos combate, a UI pode mostrar leaderboard OU recap. Testes devem aceitar ambos.

7. **Mobile fill bug**: `page.fill()` com `isMobile: true` nao persiste valores no `MonsterSearchPanel`. Se um teste mobile precisa adicionar combatentes, usar `dmSetupCombatSession` no desktop.

8. **context.close()**: Sempre usar `.catch(() => {})` pois ENOENT pode ocorrer no Windows.

---

## Helpers Uteis

```typescript
// e2e/helpers/session.ts
dmSetupCombatSession(page, account, combatants[]) // DM login + setup + start combat
playerJoinCombat(playerPage, dmPage, token, name, opts) // Player join + DM accept
goToNewSession(page) // Navigate to /app/session/new (waitUntil: domcontentloaded, 45s)

// e2e/helpers/auth.ts
loginAs(page, account) // Login via UI
loginAsDM(page, account) // Alias for DM login

// e2e/guest-qa/helpers.ts
skipGuidedTour(page) // Skip tour via localStorage
goToTryPage(page) // /try + skip tour + reload
addManualCombatant(page, combatant) // Add via manual form (handles toggle)
startCombat(page) // Click start + dismiss overlays
waitForSrdReady(page) // Wait for data-testid="srd-status" data-ready="true"
STANDARD_ENCOUNTER // 4 combatants preset
QUICK_ENCOUNTER // 2 combatants preset

// e2e/helpers/combat.ts
waitForSrdReady(page) // Alternative SRD wait (used by lair-actions, WORKS)

// e2e/fixtures/test-accounts.ts
DM_PRIMARY, DM_PRO, DM_ENGLISH // DM accounts
PLAYER_WARRIOR, PLAYER_MAGE, PLAYER_HEALER, PLAYER_ENGLISH // Player accounts
```

## Contas de Teste

- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Supabase: projeto `mdcmjpcjkqgyxvhweoqs` (producao, contas seedadas)
- Todas as contas em `e2e/fixtures/test-accounts.ts`

---

## Plano de Acao Sugerido

### Prioridade 1 — Desbloquear suites grandes
1. **Fix `getShareToken`** → desbloqueia multi-player-stress (23 tests) + J5.3
2. **Fix `waitForSrdReady`** → desbloqueia j18 (22 tests)

### Prioridade 2 — Corrigir suites parciais
3. **Fix audio selectors** → 12 tests
4. **Fix dashboard tour selectors** → 12 tests
5. **Fix J12 goto timeout** → 5 tests

### Prioridade 3 — Rodar specs novos
6. **Rodar j15** (54 tests) — fixes ja aplicados
7. **Rodar j16** (30 tests) — fixes ja aplicados

### Prioridade 4 — Re-run dos parciais
8. **Re-run campaign mind-map** (47 tests) — isolado, sem outros testes em paralelo
9. **Re-run J10.1 + J10.10** — isolado
10. **Re-run J3.2** — pode precisar de assertion diferente

### Regra de paralelismo
- Maximo 2-3 specs ao mesmo tempo
- Specs guest (sem auth) podem rodar em paralelo
- Specs auth NAO devem rodar em paralelo (compartilham contas de teste)
