# Prompt: Fix Failing E2E Tests

Cole este prompt numa nova janela do Claude Code:

---

Leia `docs/qa-e2e-results-2026-03-27.md` — é o relatório completo da última rodada de QA E2E. 55 de 82 testes passaram (67%). Todos os testes DM-only, visitor/try, i18n e core loop passam.

**As 27 falhas se dividem em 4 categorias. Resolva na ordem:**

## 1. Player Join via Share Token (20 testes — PRIORIDADE MÁXIMA)

O helper `playerJoinCombat()` em `e2e/helpers/session.ts` não completa o fluxo. O player vai pra `/join/{token}`, preenche o late-join form, mas `[data-testid="player-view"]` nunca aparece (timeout 30s).

**Investigação:**
1. Rode manualmente com Playwright MCP: DM cria sessão → gerar share token → abrir `/join/{token}` em outro contexto → ver o que aparece
2. Verifique se os selectors do late-join form mudaram (input placeholders, submit button text)
3. Verifique se o fluxo de DM approval (aceitar/aprovar jogador) mudou
4. Verifique se `data-testid="player-view"` existe em `components/player/PlayerJoinClient.tsx`
5. Capture screenshot do que o player vê no timeout

**Comando para reproduzir:**
```bash
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test e2e/journeys/j2-player-join.spec.ts --project=chromium --reporter=list
```

## 2. Campaign Picker em specs antigos (4 testes)

Os specs em `e2e/combat/session-create.spec.ts` usam a versão antiga do campaign picker (timeout 5s, sem race). O fix já existe em `goToNewSession()` exportado de `e2e/helpers/session.ts`.

**Fix:** Importe e use `goToNewSession()` em `e2e/combat/session-create.spec.ts`

```bash
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test e2e/combat/session-create.spec.ts --project=chromium --reporter=list
```

## 3. Presets Page (2 testes)

`/app/presets` não tem os selectors esperados. Verifique o que renderiza e ajuste J3.4 e J10.7.

```bash
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test e2e/journeys/j3-dm-returns.spec.ts --project=chromium --reporter=list
```

## 4. Compendium Search Input (1 teste)

J3.5 — o input de busca pode ter placeholder diferente. Verifique no componente real.

---

**Regras:**
- Sempre use `E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*"` como env vars
- Testes rodam contra produção: https://www.pocketdm.com.br
- Não mude testes que já passam
- Use `goToNewSession()` de `e2e/helpers/session.ts` para campaign picker
- Use `[cmdk-root]`, `[cmdk-input]`, `[cmdk-item]` para command palette
- Use `[data-testid^="combatant-row-"]` (não `combatant-`) para contar combatentes
- `locator.isVisible({ timeout })` NÃO ESPERA no Playwright — use `expect(locator).toBeVisible({ timeout })` ou `waitFor()`
