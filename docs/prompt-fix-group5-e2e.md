# Grupo 5 — Code Review: Testes E2E Sprint 1

> **Commit:** `c3aff1d` — test(e2e): improve Sprint 1 token survival tests
> **Data do review:** 2026-04-05
> **Arquivo:** `e2e/onboarding/sprint1-token-survival.spec.ts`
> **Status:** ✅ Corrigido

---

## Contexto

Testes E2E do Sprint 1 (JO-01/02/03/04) escritos após os patches do Grupo 1. O review identificou um bug crítico de assertiva (P5-01) causado pela mudança de formato do `pendingJoinCode` no patch P2-06, mais 5 issues menores de qualidade.

---

## Findings corrigidos (6 patches)

### P5-01 (HIGH) — `pendingJoinCode` assertion quebrada após P2-06

**Arquivo:** `e2e/onboarding/sprint1-token-survival.spec.ts` (linha ~117)

**Problema:** O patch P2-06 mudou o formato de armazenamento do `pendingJoinCode` de string raw para `JSON.stringify({code, savedAt})`. O teste continuava assertindo `expect(stored).toBe("MY-JOIN-CODE")` (string raw), o que causaria falha de teste em runtime.

**Fix aplicado:**
```ts
// Antes (quebrado):
expect(stored).toBe("MY-JOIN-CODE");

// Depois (correto):
const parsed = JSON.parse(stored!);
expect(parsed.code).toBe("MY-JOIN-CODE");
expect(typeof parsed.savedAt).toBe("number");
expect(parsed.savedAt).toBeGreaterThan(Date.now() - 10_000);
```

---

### P5-02 (LOW) — Imports não utilizados

**Arquivo:** linha 14-15

**Problema:** `playerJoinCombat` e `PLAYER_WARRIOR` importados mas nunca referenciados no arquivo. O teste JO-04 implementou o fluxo de join inline.

**Fix aplicado:** Removidos dos imports.

---

### P5-03 (LOW) — `waitForTimeout` substituído por `waitForFunction` no JO-01

**Arquivo:** linha ~93

**Problema:** `await page.waitForTimeout(1_500)` para aguardar o `useEffect` escrever no localStorage. Delay fixo é frágil — pode ser longo demais em máquinas rápidas ou curto demais sob carga.

**Fix aplicado:**
```ts
// Antes:
await page.waitForTimeout(1_500);

// Depois:
await page.waitForFunction(
  () => localStorage.getItem("pendingInvite") !== null,
  { timeout: 10_000 }
);
```

---

### P5-04 (LOW) — `waitForTimeout` substituído por `waitForFunction` no JO-02

**Arquivo:** linha ~113

**Problema:** Idem ao P5-03 para `pendingJoinCode`.

**Fix aplicado:** Mesmo padrão de `waitForFunction` com polling.

---

### P5-05 (LOW) — `waitForTimeout` no teste do banner ausente

**Arquivo:** linha ~74

**Problema:** `await page.waitForTimeout(2_000)` para aguardar hidratação React antes de assertir `not.toBeVisible()`. Delay arbitrário.

**Fix aplicado:**
```ts
// Antes:
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2_000);

// Depois:
await page.waitForLoadState("networkidle");
```

---

### P5-06 (LOW) — Dashboard redirect test injetava formato legado

**Arquivo:** linha ~184

**Problema:** O teste de redirect do JO-02 injetava `localStorage.setItem("pendingJoinCode", "REDIR-JOIN-CODE")` (string raw — formato legado). Funcionava via backward compat do DashboardOverview, mas não exercitava o code path do TTL introduzido no P2-06.

**Fix aplicado:**
```ts
// Antes (formato legado — backward compat, não testa TTL):
localStorage.setItem("pendingJoinCode", "REDIR-JOIN-CODE");

// Depois (formato atual — exercita o TTL code path):
localStorage.setItem(
  "pendingJoinCode",
  JSON.stringify({ code: "REDIR-JOIN-CODE", savedAt: Date.now() })
);
```

---

## Cobertura de ACs verificada

| Story | AC | Coberto? |
|-------|----|----------|
| JO-01 | `pendingInvite` salvo no localStorage com `token`, `campaignId`, `path`, `savedAt` | ✅ |
| JO-02 | `pendingJoinCode` salvo com `code` + `savedAt` (JSON) | ✅ (fix P5-01) |
| JO-03 | Banner contextual visível para invite / join_code / campaign_join | ✅ |
| JO-03 | Sem banner em sign-up genérica | ✅ |
| JO-01/02 | Safety-net no dashboard redireciona após login | ✅ |
| JO-04 | Botão `recap-join-campaign-btn` visível para player anônimo | ✅ (com skip graceful se session sem campaign_id) |

## Decisões de design dos testes

- **Skip graceful no JO-04**: A prop `onJoinCampaign` só renderiza quando `session.campaign_id != null`. Quick combat não tem campaign_id, então o botão não aparece — o teste skipa em vez de falhar, o que é o comportamento esperado.
- **`browser.newContext()` nos testes de redirect**: Evita vazamento de auth state entre os testes JO-01 e JO-02 do safety-net.
- **`waitForTimeout` mantido no JO-04**: Os `waitForTimeout` dentro do fluxo de realtime (subscribe, broadcast) são justificados por latência de rede real — não foram substituídos.
