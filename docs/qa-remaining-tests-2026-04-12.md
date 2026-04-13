# QA Remaining Tests — Prompt para o Proximo Agente

## Contexto

Duas sessoes de QA ja rodaram (2026-04-12). **~130 tests em 15 suites estao passando**. Restam **20 spec files (~211 tests) nunca rodados**. O dev server roda na porta 3111.

### Ambiente

```bash
# Dev server (precisa estar rodando)
npm run dev  # porta 3111

# Comando base para todos os testes
BASE_URL=http://localhost:3111 npx playwright test <spec> --project=desktop-chrome --reporter=line
```

### Regras de correcao (aprendidas nas sessoes anteriores)

1. **Minimo 2 combatentes**: `EncounterSetup.tsx` exige `combatants.length >= 2` para habilitar "Iniciar Combate". Se um teste cria apenas 1 combatente, adicionar um segundo dummy.

2. **Manual form toggle**: O form manual em `MonsterSearchPanel` fica colapsado. Testes devem clicar `button:has-text(/Manual/i)` antes de preencher `[data-testid="add-row-name"]`.

3. **`encounter-name-input` removido**: Nome do encontro e auto-gerado. Remover qualquer `page.fill('[data-testid="encounter-name-input"]', ...)`.

4. **Tour modal bloqueia**: Testes no `/try` ou dashboard podem ter tour modal. Usar `skipGuidedTour(page)` de `e2e/guest-qa/helpers.ts` + `page.reload()`.

5. **`setup-row-` count**: Usar `[data-testid^="setup-row-"]` para contar combatentes adicionados.

6. **Post-combat flow**: Apos combate, a UI pode mostrar leaderboard OU recap. Testes devem aceitar ambos. Nao esperar que `next-turn-btn` desapareca — verificar `body` content.

7. **Mobile fill bug**: `page.fill()` com `isMobile: true` nao persiste valores no `MonsterSearchPanel`. Se um teste mobile precisa adicionar combatentes, usar `dmSetupCombatSession` no desktop e so o player view no mobile.

8. **context.close()**: Sempre usar `.catch(() => {})` pois ENOENT pode ocorrer no Windows.

---

## Suites para rodar — organizadas por prioridade

### BLOCO 1 — Core Journeys (~30 tests, ~5min)

```bash
BASE_URL=http://localhost:3111 npx playwright test \
  e2e/journeys/j3-dm-returns.spec.ts \
  e2e/journeys/j5-share-link.spec.ts \
  e2e/journeys/j7-compendium-oracle.spec.ts \
  e2e/journeys/j10-free-all-features.spec.ts \
  e2e/journeys/j12-combat-resilience.spec.ts \
  --project=desktop-chrome --reporter=line
```

| Spec | ~Tests | O que testa |
|------|--------|-------------|
| j3-dm-returns | 4 | DM retorna a sessao ativa |
| j5-share-link | 2 | Gerar e compartilhar link |
| j7-compendium-oracle | 9 | Compendio + Command Palette |
| j10-free-all-features | 10 | Todas features do free tier |
| j12-combat-resilience | 5 | Reconexao, crash recovery |

### BLOCO 2 — Combat Mechanics (~45 tests, ~8min)

```bash
BASE_URL=http://localhost:3111 npx playwright test \
  e2e/combat/session-create.spec.ts \
  e2e/combat/player-join.spec.ts \
  e2e/combat/player-view.spec.ts \
  e2e/combat/lair-actions.spec.ts \
  e2e/combat/multi-player-stress.spec.ts \
  --project=desktop-chrome --reporter=line
```

| Spec | ~Tests | O que testa |
|------|--------|-------------|
| session-create | 5 | Criar sessao com combatentes |
| player-join | 2 | Fluxo de join do player |
| player-view | 7 | View sanitizada do player |
| lair-actions | 8 | Lair actions, legendary actions |
| multi-player-stress | 23 | Stress com multiplos players |

### BLOCO 3 — Features (~8 tests, ~3min)

```bash
BASE_URL=http://localhost:3111 npx playwright test \
  e2e/features/active-effects.spec.ts \
  e2e/features/audio-broadcast.spec.ts \
  --project=desktop-chrome --reporter=line
```

| Spec | ~Tests | O que testa |
|------|--------|-------------|
| active-effects | 5 | Efeitos ativos, consumiveis |
| audio-broadcast | 3 | Broadcast de audio para players |

### BLOCO 4 — Extended QA Sweeps (~122 tests, ~20min)

```bash
BASE_URL=http://localhost:3111 npx playwright test \
  e2e/journeys/j15-comprehensive-qa-sweep.spec.ts \
  e2e/journeys/j16-full-platform-walkthrough.spec.ts \
  e2e/journeys/j17-sprint-audio-feedback.spec.ts \
  e2e/journeys/j18-compendium-full-coverage.spec.ts \
  --project=desktop-chrome --reporter=line
```

| Spec | ~Tests | O que testa |
|------|--------|-------------|
| j15-comprehensive-qa | 54 | Sweep geral de qualidade |
| j16-full-platform | 30 | Walkthrough completo da plataforma |
| j17-sprint-audio | 16 | Audio, soundboard, ambient |
| j18-compendium-full | 22 | Cobertura completa do compendio |

### BLOCO 5 — Legacy/Duplicates (~6 tests, ~2min)

```bash
BASE_URL=http://localhost:3111 npx playwright test \
  e2e/journeys/dm-happy-path.spec.ts \
  e2e/journeys/dm-reconnect.spec.ts \
  e2e/journeys/guest-try-mode.spec.ts \
  e2e/journeys/player-mobile.spec.ts \
  --project=desktop-chrome --reporter=line
```

Estes provavelmente sao cobertos pelos J* equivalentes. Podem ser skippados ou deletados se forem duplicatas.

---

## Script completo — roda tudo sequencial

```bash
#!/bin/bash
# qa-remaining-all.sh — Roda os 20 spec files restantes
# Uso: BASE_URL=http://localhost:3111 bash docs/qa-remaining-all.sh

set -e
export BASE_URL="${BASE_URL:-http://localhost:3111}"
PW="npx playwright test --project=desktop-chrome --reporter=line"

echo "=== BLOCO 1: Core Journeys ==="
$PW e2e/journeys/j3-dm-returns.spec.ts e2e/journeys/j5-share-link.spec.ts e2e/journeys/j7-compendium-oracle.spec.ts e2e/journeys/j10-free-all-features.spec.ts e2e/journeys/j12-combat-resilience.spec.ts || true

echo ""
echo "=== BLOCO 2: Combat Mechanics ==="
$PW e2e/combat/session-create.spec.ts e2e/combat/player-join.spec.ts e2e/combat/player-view.spec.ts e2e/combat/lair-actions.spec.ts e2e/combat/multi-player-stress.spec.ts || true

echo ""
echo "=== BLOCO 3: Features ==="
$PW e2e/features/active-effects.spec.ts e2e/features/audio-broadcast.spec.ts || true

echo ""
echo "=== BLOCO 4: Extended QA ==="
$PW e2e/journeys/j15-comprehensive-qa-sweep.spec.ts e2e/journeys/j16-full-platform-walkthrough.spec.ts e2e/journeys/j17-sprint-audio-feedback.spec.ts e2e/journeys/j18-compendium-full-coverage.spec.ts || true

echo ""
echo "=== BLOCO 5: Legacy ==="
$PW e2e/journeys/dm-happy-path.spec.ts e2e/journeys/dm-reconnect.spec.ts e2e/journeys/guest-try-mode.spec.ts e2e/journeys/player-mobile.spec.ts || true

echo ""
echo "=== COMPLETO ==="
```

---

## O que ja esta passando (NAO MEXER)

| Suite | Tests | Status |
|-------|-------|--------|
| J1 First Combat | 4/4 | PASS |
| J2 Player Join | 4/4 | PASS |
| J6 Core Combat Loop | 4/4 | PASS |
| J8 Try Full Funnel | 6/6 | PASS |
| J9 DM vs Player Visibility | 5/5 | PASS |
| J11 Player View Complete | 6/6 | PASS |
| J14 i18n pt-BR | 7/7 | PASS |
| a11y Accessibility | 6/6 | PASS |
| Auth Login | ALL | PASS |
| Turn Advance | 3/3 | PASS |
| Guest Desktop D01-D16 | 16/16 | PASS |
| Guest Mobile M01-M14 | 14/14 | PASS |
| 10x Adversarial | 38/38 | PASS |
| Load Test | ALL | PASS |
| **J13 Mobile** | **3/6** | **Playwright isMobile fill() bug — nao e bug da app** |

## Helpers uteis

```typescript
// e2e/helpers/session.ts
dmSetupCombatSession(page, account, combatants[]) // DM login + setup + start combat
playerJoinCombat(playerPage, dmPage, token, name, opts) // Player join + DM accept
goToNewSession(page) // Navigate to /app/session/new

// e2e/helpers/auth.ts
loginAs(page, account) // Login via UI
loginAsDM(page, account) // Alias for DM login

// e2e/guest-qa/helpers.ts
skipGuidedTour(page) // Skip tour via localStorage
goToTryPage(page) // /try + skip tour + reload
addManualCombatant(page, combatant) // Add via manual form (handles toggle)
startCombat(page) // Click start + dismiss overlays
STANDARD_ENCOUNTER // 4 combatants preset
QUICK_ENCOUNTER // 2 combatants preset

// e2e/fixtures/test-accounts.ts
DM_PRIMARY, PLAYER_WARRIOR, PLAYER_MAGE // Test accounts
```

## Contas de teste

- DM: `dm.primary@test-taverna.com`
- Outras contas em `e2e/fixtures/test-accounts.ts`
- Supabase: projeto mdcmjpcjkqgyxvhweoqs (producao, contas seedadas)
