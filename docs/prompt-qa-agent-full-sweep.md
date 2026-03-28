# Roteiro QA Agent — Varredura Completa Pocket DM

Cole este prompt numa nova janela do Claude Code.

---

## Contexto

Você é o agente de QA do Pocket DM (pocketdm.com.br). O projeto tem **150 cenários E2E** em Playwright rodando contra produção. A última varredura (2026-03-28) atingiu **93% pass rate**.

Leia `docs/qa-e2e-results-2026-03-28.md` para o relatório completo.

## Credenciais

```bash
E2E_DM_EMAIL="danielroscoe97@gmail.com"
E2E_DM_PASSWORD="Eusei123*"
```

**NUNCA** use essas credenciais em testes destrutivos (delete account, etc).

## Fase 1 — Rodar Suite Completa (Baseline)

```bash
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test --project=chromium --reporter=list
```

Registre: total pass/fail/flaky/skip. Compare com o baseline anterior (139/150).

## Fase 2 — Investigar Falhas

Para cada teste que falhou:

1. **Leia o erro** no output do terminal
2. **Veja o screenshot** em `e2e/results/<test-name>/test-failed-1.png`
3. **Abra o trace** para debug detalhado:
   ```bash
   npx playwright show-trace e2e/results/<test-name>/trace.zip
   ```
4. **Use Playwright MCP** para reproduzir manualmente:
   - Navegue para a URL do teste
   - Execute os mesmos passos
   - Capture o snapshot para ver os selectors reais

## Fase 3 — Categorizar e Corrigir

### Categoria A: Selector Mismatch (fix rápido)
O HTML real mudou mas o teste usa selector antigo.
**Fix:** Atualizar o selector no spec file para match o HTML real.
**Regra:** Use `[data-testid="..."]` sempre que disponível. Quando não houver, use `button:has-text("...")` ou `input[placeholder*="..."]`.

### Categoria B: Timing/Flaky (fix médio)
O teste passa às vezes mas falha por timeout.
**Fix:**
- Aumentar timeout: `{ timeout: 15_000 }` → `{ timeout: 20_000 }`
- Usar `waitForLoadState("networkidle")` em vez de `"domcontentloaded"`
- Adicionar `waitForTimeout(3_000)` após navegação para hydration
- **NUNCA** usar `.isVisible({ timeout })` para esperar — use `expect(locator).toBeVisible({ timeout })`

### Categoria C: Bug de Produção (fix complexo)
O app tem um bug real que o teste detectou.
**Fix:** Corrigir o código de produção, não o teste.
**Regra:** Documente o bug em `docs/` antes de fixar.

### Categoria D: Player Join Broadcast (BLOQUEADOR CONHECIDO)
~7 testes falham porque o broadcast Supabase Realtime `combat:late_join_response` não chega ao player.
**Status:** Fix de fallback já deployed (`a3c1ebb`). Se ainda falha, o problema é que o polling fallback (`/api/session/{id}/state`) não detecta o combatante a tempo.
**Investigação:**
1. Rode `e2e/journeys/j2-player-join.spec.ts` isolado
2. Se J2.6 (link inválido) e J2.8 (mobile form) passam mas J2.3/J2.4 falham → confirma bug de broadcast
3. Use Playwright MCP com **2 contextos separados** (DM + Player anônimo) para testar manualmente

## Fase 4 — Testes Manuais com Playwright MCP

Use o Playwright MCP para verificar fluxos que E2E automatizado não cobre bem:

### 4.1 — Fluxo Completo DM (logado)
```
1. Navegar para /auth/login
2. Logar com credenciais
3. Dashboard → verificar campanhas, encontros ativos
4. Nova Sessão → campaign picker → Combate Rápido
5. Adicionar 3 combatentes (manual + SRD search)
6. Gerar share link + verificar QR code
7. Iniciar combate
8. Avançar 3 turnos
9. Aplicar dano no goblin (HP adjuster)
10. Aplicar condição "Frightened"
11. Derrotar combatente
12. Encerrar combate → verificar leaderboard
13. Voltar ao dashboard → verificar sessão salva
```

### 4.2 — Fluxo Completo Player (link direto)
```
1. Abrir /join/{token} em contexto anônimo
2. Verificar formulário de late-join (nome, iniciativa, HP, CA)
3. Preencher e submeter
4. Verificar "Aguardando aprovação..."
5. (No contexto DM) Aceitar via toast
6. Verificar transição para player-view
7. Verificar HP tiers (LIGHT/MODERATE/HEAVY/CRITICAL) — sem números exatos
8. Verificar notificação de turno
9. Refresh → verificar que player-view volta
```

### 4.3 — Fluxo Visitor (sem conta)
```
1. Limpar cookies
2. Navegar para /
3. Clicar "Começar Agora (Grátis)" → /try
4. Adicionar 2 combatentes
5. Iniciar combate
6. Avançar turno + ajustar HP
7. Verificar que NUNCA aparece tela de login
8. Verificar CTA de signup visível
```

### 4.4 — Compendium Deep Dive
```
1. /app/compendium?tab=monsters → buscar "Adult Red Dragon"
2. Clicar no resultado → verificar stat block (HP, AC, STR, ações)
3. Tab spells → buscar "Fireball" → verificar 8d6, Evocation
4. Tab conditions → verificar lista completa (13 condições D&D)
5. Tab items → verificar que carrega
6. Command Palette (Ctrl+K) → buscar "Goblin" → verificar resultado
```

### 4.5 — Mobile (Pixel 5: 393x851)
```
1. Todas as páginas: zero overflow horizontal
2. /try → adicionar combatente → botão "Adicionar" clicável sem scroll
3. Player view → texto legível, botões com min 44x44px
4. Landing page → CTA visível sem scroll horizontal
```

### 4.6 — Resilience
```
1. DM cria combate → F5 → combate preservado
2. DM fecha aba → reabre URL → dados intactos
3. Player perde conexão (offline) → reconecta → player-view volta
4. 3 refreshes rápidos → estado não corrompido
```

### 4.7 — i18n
```
1. DM pt-BR: dashboard, combate, condições — tudo em português
2. DM English: mudar idioma em /app/settings → interface em inglês
3. Visitor: /try mostra pt-BR por default
4. Player: /join/{token} mostra pt-BR
```

### 4.8 — Edge Cases
```
1. /join/token-invalido → erro amigável (não 500)
2. /app/session/uuid-inexistente → erro amigável
3. /this-route-does-not-exist → 404 sem raw error
4. Iniciar combate sem combatentes → botão desabilitado
5. Adicionar combatente com nome vazio → validação
```

## Fase 5 — Screenshot Evidence

Para cada fluxo manual, tire screenshot:
```
mcp__playwright__browser_take_screenshot com filename descritivo
```

Salve em `qa-screenshots/` com nomes como:
- `qa-screenshots/sweep-dashboard-loaded.png`
- `qa-screenshots/sweep-combat-3-combatants.png`
- `qa-screenshots/sweep-player-view-hp-tiers.png`

## Fase 6 — Relatório

Gere `docs/qa-e2e-results-YYYY-MM-DD.md` com:

1. **Resumo executivo** (1 parágrafo)
2. **Tabela pass/fail por suite**
3. **Lista de falhas com causa raiz**
4. **Lista de bugs encontrados** (se houver)
5. **Screenshots de evidência** (referência aos arquivos)
6. **Próximos passos recomendados**

## Regras Gerais

- Testes rodam contra **produção**: https://www.pocketdm.com.br
- **NUNCA** mude testes que já passam sem motivo
- Use `expect(locator).toBeVisible({ timeout })` — **NUNCA** `.isVisible({ timeout })`
- Selectors prioritários: `[data-testid]` > `button:has-text()` > `input[placeholder*=]` > CSS class
- Combatant rows: `[data-testid^="combatant-row-"]` (não `combatant-`)
- Command palette: `[cmdk-root]`, `[cmdk-input]`, `[cmdk-item]`
- Compendium search: `input[placeholder*="Filtrar"]`
- HP bars MUST usar tiers: LIGHT (>70%) / MODERATE (>40%) / HEAVY (>10%) / CRITICAL (≤10%) — regra imutável
- O `test.setTimeout(90_000)` é necessário para testes multi-contexto (DM + Player)
- Video e screenshot gravados em todos os testes (`playwright.config.ts`: `video: "on"`, `screenshot: "on"`)

## Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `playwright.config.ts` | Config do Playwright (base URL, timeouts, video) |
| `e2e/helpers/auth.ts` | `loginAs()`, `loginAsDM()`, `logout()` |
| `e2e/helpers/session.ts` | `goToNewSession()`, `dmSetupCombatSession()`, `playerJoinCombat()`, `getShareToken()` |
| `e2e/fixtures/test-accounts.ts` | Contas de teste (DM_PRIMARY, PLAYER_WARRIOR, etc.) |
| `e2e/journeys/j1-*.spec.ts` a `j15-*.spec.ts` | 150 cenários de jornada |
| `e2e/combat/*.spec.ts` | Testes de combate core |
| `e2e/audio/*.spec.ts` | Testes de áudio/soundboard |
| `e2e/auth/login.spec.ts` | Testes de login |
| `e2e/visitor/try-mode.spec.ts` | Testes de modo guest |
| `docs/qa-e2e-results-2026-03-28.md` | Último relatório de QA |
| `docs/postmortem-e2e-failures-2026-03-27.md` | Postmortem das falhas anteriores |

## Checklist Final

- [ ] Suite completa rodou (150 testes)
- [ ] Todas as falhas investigadas e categorizadas
- [ ] Fixes aplicados para Cat A (selectors) e Cat B (timing)
- [ ] Bugs de Cat C documentados
- [ ] Fluxos manuais 4.1–4.8 executados com Playwright MCP
- [ ] Screenshots salvos como evidência
- [ ] Relatório gerado em `docs/`
- [ ] Commit + push dos fixes e relatório
