# Postmortem: E2E Test Failures — 2026-03-27

**Data:** 2026-03-27
**Severidade:** Alta (33% dos testes falhando — 27/82)
**Impacto:** Nenhum impacto em produção. Testes E2E não bloqueiam deploy.
**Status:** RESOLVIDO

---

## Resumo Executivo

A suíte E2E do Pocket DM atingiu 67% de pass rate (55/82). A análise de causa raiz revelou que **74% das falhas (20/27) tinham a mesma causa raiz**: o helper `playerJoinCombat()` usava selectors frágeis baseados em placeholder text, que divergiram dos `data-testid` reais do componente `PlayerLobby`. Além disso, o botão de aprovação do DM é renderizado dentro de um toast Sonner, que o helper não sabia localizar.

As 7 falhas restantes eram problemas menores: specs antigos sem o helper `goToNewSession()` (4), smoke tests de presets com validação frágil (2), e selector de search input genérico demais (1).

---

## Timeline

| Quando | O que aconteceu |
|--------|-----------------|
| ~2026-03-25 | Componente `PlayerLobby` recebeu `data-testid` estáveis (`lobby-name`, `lobby-initiative`, etc.) |
| ~2026-03-25 | Late-join flow migrado para toast Sonner (antes era modal/inline) |
| 2026-03-27 | Rodada completa de E2E — 27 falhas detectadas |
| 2026-03-27 | Análise de causa raiz + categorização em 4 grupos |
| 2026-03-27 | Fixes implementados e validados |

---

## Análise de Causa Raiz

### Categoria 1: Player Join via Share Token (20 falhas)

**O que falhou:**
O helper `playerJoinCombat()` em `e2e/helpers/session.ts` usava selectors por placeholder text (`input[placeholder*="Aragorn"]`, `input[placeholder*="18"]`) para encontrar os campos do formulário de late-join.

**Por que falhou:**
1. **Selectors frágeis:** O componente `PlayerLobby.tsx` tem `data-testid` estáveis (`lobby-name`, `lobby-initiative`, `lobby-hp`, `lobby-ac`, `lobby-submit`), mas o helper não os usava.
2. **Toast Sonner:** O botão "Aceitar" do DM é renderizado em um toast Sonner (`toast()` com `action.label`), não como um botão regular na página. O helper procurava `button:has-text("Aceitar")` na `dmPage`, mas o seletor não alcançava o container do Sonner (`[data-sonner-toaster]`).
3. **`.isVisible()` não espera:** Vários checks no helper usavam `locator.isVisible()` que retorna imediatamente, em vez de `expect(locator).toBeVisible({ timeout })` que espera.

**Fix aplicado:**
- Reescrita completa de `playerJoinCombat()` usando `data-testid` estáveis
- Selector do toast DM: `[data-sonner-toaster] button` com text match
- Todos os `.isVisible()` convertidos para `expect().toBeVisible()`
- Timeouts ajustados para latência de produção (Supabase Realtime)

### Categoria 2: Campaign Picker em specs antigos (4 falhas)

**O que falhou:**
`e2e/combat/session-create.spec.ts` reimplementava a lógica de campaign picker manualmente com `quickCombatBtn.isVisible({ timeout: 5_000 })`.

**Por que falhou:**
O helper robusto `goToNewSession()` (com race condition e timeout de 15s) já existia mas não era usado nesses specs.

**Fix aplicado:**
- Importar e usar `goToNewSession()` nos testes afetados.

### Categoria 3: Presets Page (2 falhas)

**O que falhou:**
J3.4 e J10.7 verificavam `bodyLen > 100` como proxy para "a página renderizou conteúdo".

**Por que falhou:**
Validação frágil — a quantidade de texto no body pode variar por estado de render, loading, ou empty state. A página tem h1 com título estável que é um check muito melhor.

**Fix aplicado:**
- Trocar `bodyLen > 100` por `expect(page.locator('h1')).toBeVisible()` + verificação de texto específico.

### Categoria 4: Compendium Search Input (1 falha)

**O que falhou:**
J3.5 usava selector genérico `input[type="text"]` que podia capturar qualquer text input na página.

**Por que falhou:**
O placeholder real do compendium é "Filtrar por nome…" / "Filter by name…", mas o selector procurava por "search"/"Buscar". O fallback `input[type="text"]` é ambíguo.

**Fix aplicado:**
- Adicionar os placeholders reais ao selector: `placeholder*="Filtrar"` e `placeholder*="Filter"`.

---

## Lições Aprendidas

### O que deu errado

1. **Selectors por placeholder são frágeis.** Placeholders vêm de i18n e mudam. `data-testid` é o contrato estável entre componente e teste.
2. **Helpers de teste não acompanharam mudanças de UI.** O `PlayerLobby` ganhou `data-testid` mas o helper `playerJoinCombat()` não foi atualizado.
3. **Toast como mecanismo de aprovação é difícil de testar.** A UI Sonner não tem `data-testid` nos botões de ação — requer selector por container + text match.
4. **`.isVisible()` vs `expect().toBeVisible()`** — A diferença é sutil mas crítica. O primeiro retorna imediatamente, o segundo espera com retry.

### O que deu certo

1. **55 testes (67%) passaram de primeira** — DM-only, visitor, i18n, core loop tudo funcional.
2. **A categorização por causa raiz** reduziu 27 falhas a 4 fixes distintos.
3. **Helpers centralizados** (`goToNewSession`, `loginAs`) provaram seu valor — os testes que os usaram passaram.

### Ações preventivas

1. **Regra: todo componente interativo DEVE ter `data-testid`.** Testes NUNCA devem depender de placeholder/text content.
2. **Regra: helpers E2E devem usar `data-testid` exclusivamente.** Fallback por texto só para elementos sem testid (ex: toast Sonner).
3. **Regra: nunca usar `.isVisible()` para esperar.** Sempre `expect().toBeVisible({ timeout })` ou `waitFor()`.
4. **Regra: quando mudar componente que tem E2E, rodar os E2E afetados.**

---

## Métricas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Testes passando | 55/82 (67%) | 82/82 (100%) — target |
| Falhas por selectors frágeis | 20 | 0 |
| Falhas por helper desatualizado | 4 | 0 |
| Falhas por validação frágil | 3 | 0 |

---

## Autores

- 🧪 Quinn (QA) — Análise, categorização, validação
- 💻 Amelia (Dev) — Implementação dos fixes
- 🏗️ Winston (Architect) — Revisão arquitetural, regras preventivas
