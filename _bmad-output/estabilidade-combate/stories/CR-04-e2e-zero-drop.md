# CR-04 — E2E Zero-Drop Reconnect Test

**Epic:** Estabilidade Combate
**Camada:** gate (proves L1+L3 juntas)
**Prioridade:** P0 — Combat Parity Rule requires
**Estimate:** 0.5-1 dia
**Dependencies:** CR-01, CR-02, CR-03 merged
**Deliverable:** `e2e/features/connection-resilience.spec.ts`

---

## Problem

R3 sem teste automatizado = drift no primeiro refactor. PRs futuros podem quebrar resume silenciosamente. Além disso, sem spec, o Combat Parity Gate bloqueia ou vira label farm.

## Goal / Value

Prova automatizada de zero-drop reconnect em 2 modos (Anon via `/join`, Auth via logged-in player). Cobertura pra o Parity Gate passar sem `parity-exempt`. Artefato permanente que rejeita regressões.

## Acceptance Criteria

- [ ] **AC1** — Novo arquivo `e2e/features/connection-resilience.spec.ts`

- [ ] **AC2** — **Test 1: Anon mode zero-drop** — `test("Anon player resumes missed events after 10s offline", ...)`
  Passos:
  1. DM loga, cria session + encounter + adiciona 3 monstros
  2. Player (anon context) abre `/join/[token]`, registra nome + iniciativa
  3. Combate inicia
  4. DM faz 1 HP update → player recebe via broadcast (baseline)
  5. `page.context().setOffline(true)` — player offline
  6. DM faz 5 mutações: HP update x3, condition add, turn advance
  7. Aguarda 3s (garante broadcasts enviados)
  8. `page.context().setOffline(false)` — player volta
  9. Aguarda até 5s pra resume completar (via state machine + event resume hook)
  10. **Assert:** UI do player reflete os 5 eventos aplicados:
      - HP dos 3 monstros nos valores pós-update
      - Condition aparece
      - Round/turn avançou

- [ ] **AC3** — **Test 2: Auth mode zero-drop** — mesmo cenário com DM + player autenticados via `loginAs()`
  Usar `e2e/helpers/auth.ts:loginAs(page, PLAYER_WARRIOR)` antes do player abrir a sessão

- [ ] **AC4** — **Test 3: Too-stale fallback** — `test("Player with stale cursor falls back to full refetch", ...)`
  Passos:
  1. DM + player setup normal
  2. Player online, recebe 1 evento inicial (seq=1)
  3. Player offline
  4. DM faz **150 mutações** (rápido, HP-spam) — excede buffer cap 100
  5. Player volta online
  6. **Assert:** UI do player mostra estado final correto (via `/state` fallback acionado)
  7. **Assert:** `too_stale` response foi recebido — via interceptar network `expect(toStaleResponseSeen).toBe(true)` OU via console log inspect

- [ ] **AC5** — **Guest mode:** N/A — documentar via `parity-intent` comment no spec file:
  ```
  // parity-intent
  // guest: n/a (GuestCombatClient is local-only, no realtime channel to resume)
  ```

- [ ] **AC6** — **Skeleton rendering** — extender Test 1 com asserção:
  - Antes de `setOffline(false)` (ainda offline 10s), verificar `[data-testid="reconnecting-skeleton"]` visível
  - Após resume, skeleton desaparece

- [ ] **AC7** — **Parity Gate passa sem `parity-exempt`** — CI rodando esse spec satisfaz os 3 modos (Auth via Test 2, Anon via Test 1, Guest via parity-intent comment)

- [ ] **AC8** — Tests rodam em <2min total (evitar brittleness com waits longos; usar `waitFor` com condições claras)

## Technical Approach

### Helpers reutilizáveis

Pode precisar adicionar a `e2e/helpers/combat.ts`:

```typescript
export async function dmMakeHpUpdate(page: Page, combatantId: string, newHp: number) { /* ... */ }
export async function waitForResumeComplete(page: Page, expectedCurrentSeq: number) { /* poll UI or check last-seen marker */ }
```

### Network manipulation (Playwright)

```typescript
// Offline/online toggle
await page.context().setOffline(true);
await page.context().setOffline(false);

// Intercept /events endpoint pra AC4
const responses: Response[] = [];
page.on("response", (r) => {
  if (r.url().includes("/events?since_seq=")) responses.push(r);
});
```

### Timing

- Broadcasts são ~100-500ms end-to-end em local test env
- Resume: state machine emit `connected` → 300ms debounce → fetch → apply
- Total: espera ~2s pós-online deve ser suficiente
- Usar `expect(...).toEventually(...)` com timeout 5s, não sleep fixo

### Test setup reutilizado

- `e2e/helpers/session.ts:createDmSession` (se existe; se não, bolar)
- `e2e/helpers/auth.ts:loginAs` / `loginAsDM`
- Fixtures de monstros do seed

## Tasks

- [ ] **T1** (30min) — Scaffolding spec file + imports + describe block
- [ ] **T2** (1.5h) — Test 1 (Anon zero-drop) — incluindo setup DM + player contexts
- [ ] **T3** (1h) — Test 2 (Auth zero-drop) — adapta Test 1 com loginAs
- [ ] **T4** (1.5h) — Test 3 (too_stale) — precisa orquestrar 150 mutações rápidas
- [ ] **T5** (30min) — AC6 skeleton assertion
- [ ] **T6** (30min) — parity-intent comment + verify gate passes em CI
- [ ] **T7** (30min) — Debug flakes, estabilizar

## Test Strategy

**E2E only** — essa story É sobre E2E. Se algum teste descobrir bug no CR-01/02/03, volta pra essas stories pra fix.

**Execution:**
- `npx playwright test e2e/features/connection-resilience.spec.ts`
- Deve rodar em CI também (já tem Playwright workflow)

**Acceptance bar:**
- 3 testes verdes, rodando em <2min
- Parity gate passa sem label

## Dependencies

- CR-01, CR-02, CR-03 all merged
- Playwright infra setup (já existe)
- Fixture data DM test user + sample monsters

## Definition of Done

- [ ] Todos ACs checked
- [ ] 3 testes passam localmente 3x seguidas (não-flaky)
- [ ] PR aberto, CI verde (Parity + Playwright)
- [ ] Parity gate passa naturalmente (sem `parity-exempt`)
- [ ] Merged

## Out of Scope

- ❌ Stress test (100 players simultâneos) — tooling separado, próximo sprint se precisar
- ❌ Teste de DM próprio reconectando — mesmo hook, redundante
- ❌ Multi-tab same user — edge case raro, fica pra teste manual
- ❌ Broker-wide outage simulation — infraestrutura de caos, não esse sprint

## Riscos

| Risco | Mitigação |
|---|---|
| Playwright flake em `setOffline` timing | Usar `waitFor` baseado em UI state (ex: skeleton visible), não sleep |
| 150 mutações em sequência lenta (AC4) | Emitir via direct DB writes + broadcast manual, não via UI click |
| CI timeout com 3 testes longos | Paralelizar onde possível; ajustar workers no playwright.config |
| Test 3 too_stale não conclui antes do cap 100 | Garantir mutações síncronas sem wait intermediate |
| Helper infra existente insuficiente | T2 inclui buffer pra criar helpers novos |
