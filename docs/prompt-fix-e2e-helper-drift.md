# Prompt — Fix E2E Helper Drift (`e2e/helpers/session.ts`)

**Missão:** Destravar TODOS os Playwright specs do projeto atualizando testids drift'ados em `e2e/helpers/session.ts` após Dani finalizar WIP em `app/app/combat/new/page.tsx` + `components/combat-session/CombatSessionClient.tsx`.

## Contexto

Durante execução de QA da Wave 3a+3b (commit `da219f13`), tentativa de rodar
`npx playwright test e2e/conversion/dismissal-memory.spec.ts --project=desktop-chrome`
falhou em `dmSetupCombatSession` (helper `e2e/helpers/session.ts:158`) esperando
`[data-testid="active-combat"]` por 15s após clicar `[data-testid="start-combat-btn"]`.

Fluxo que funciona ANTES do ponto de falha:
- Dev server auto-start com `NEXT_PUBLIC_E2E_MODE=true` ✅
- DM login ✅
- Campaign creation ✅
- Session/encounter create ✅
- Add combatants ✅
- Click "start combat" ✅
- **Espera active-combat render → TIMEOUT** ❌

Causa provável: testid `active-combat` foi **renomeado ou removido** durante a refactor
que Dani tá fazendo em:
- `app/app/combat/new/page.tsx`
- `components/combat-session/CombatSessionClient.tsx`

(ambos em M status no `git status` quando tentei rodar).

## Pré-requisitos

**NÃO começar enquanto a WIP de combate estiver em andamento.** Confirme com `rtk git status`:

```bash
rtk git status --short | grep -E "combat/new|CombatSessionClient"
```

Se retornar algo, a refactor ainda não foi commitada. **ESPERE** Dani fechar ou peça
pra ela commitar primeiro. Reiniciar infra e2e sobre código em flux é receita de retrabalho.

## Leitura obrigatória

1. `e2e/helpers/session.ts` — inteiro (~300 linhas). Foco especial em `dmSetupCombatSession`
   (~linhas 80-162) que é o maior afetado.
2. `docs/testing-data-testid-contract.md` — se existir; lista oficial de testids mantidos.
3. `e2e/helpers/dm-setup.ts` e `e2e/helpers/player-setup.ts` (se existem) — helpers adjacentes
   que podem ter drift similar.
4. Git diff das recent changes em combat-session:
   ```bash
   rtk git log --oneline --all -- app/app/combat/new/page.tsx | head -10
   rtk git log --oneline --all -- components/combat-session/CombatSessionClient.tsx | head -10
   ```
   Identifica qual commit renomeou/removeu testids.

## Escopo do fix

### 1. Audit dos testids referenciados em `e2e/helpers/session.ts`

Extraia lista de **todos** os seletores `[data-testid="..."]` usados no helper via:

```bash
rtk grep -n 'data-testid="' e2e/helpers/session.ts
```

Para cada testid, verifique se ainda existe no código de produção:

```bash
rtk grep -rn 'data-testid="active-combat"' app/ components/
rtk grep -rn 'data-testid="start-combat-btn"' app/ components/
rtk grep -rn 'data-testid="add-row-name"' app/ components/
# ... e assim por diante
```

Se um testid não tem match em produção, **está drift'ado**. Opções:
- (a) **Atualizar helper** pra usar testid novo (se UI mudou nome mas intent é mesmo)
- (b) **Restaurar testid** no componente de produção (se foi removido acidentalmente)
- (c) **Fallback selector** baseado em texto/role se testid virou dinâmico

Preferência: (a) > (b) > (c). Tests devem seguir UI, não travar refactor de UI.

### 2. Testar um spec canônico localmente

Após atualizar helper:

```bash
npx kill-port 3000  # garante restart limpo
npx playwright test e2e/conversion/dismissal-memory.spec.ts --project=desktop-chrome --reporter=list
```

`dismissal-memory.spec.ts` é o mais simples — se esse passa, a infra tá OK. Se ainda falha,
debug a próxima camada.

Expected result: 1 test passes em ~60-90s (prod Supabase é mais lento que local).

### 3. Rodar suite completa Wave 3

```bash
npx playwright test e2e/conversion/ --project=desktop-chrome --reporter=list
```

7 tests esperados. Se todos passarem, rode mobile-safari também:

```bash
npx playwright test e2e/conversion/ --project=mobile-safari --reporter=list
```

### 4. Rodar suites adjacentes pra confirmar no regression

```bash
npx playwright test e2e/features/ --project=desktop-chrome --reporter=list
npx playwright test e2e/auth/ --project=desktop-chrome --reporter=list
npx playwright test e2e/combat/ --project=desktop-chrome --reporter=list
```

Qualquer spec que usava o helper antigo deve passar agora.

### 5. Cleanup de test data órfã em produção

Antes de rodar o E2E, houve uma tentativa anterior que criou ~1 campaign em
`danielroscoe97@gmail.com` antes de falhar. Cleanup via Supabase SQL Editor:

```sql
-- Identificar campaigns criadas por test run órfão
SELECT id, name, created_at 
FROM campaigns 
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com')
  AND name LIKE '%test%' OR name LIKE '%e2e%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Depois de confirmar, deletar (cuidado: CASCADE):
-- DELETE FROM campaigns WHERE id IN (...);
```

Os specs têm `test.afterEach(cleanup)` via `/api/e2e/cleanup`, mas se o teste falhar
antes do afterEach (como aconteceu), cleanup não roda.

## Contratos mantidos

- **Não modifique specs em `e2e/conversion/`** — eles foram atualizados na commit `052c188c`
  (QA Wave 3) com testids corretos da Story 03-F. Problema tá só no helper compartilhado.
- **Não modifique código de produção** exceto pra restaurar testids se caso (b) acima for
  aplicável.
- **Não desabilite tests** com `.skip` ou `.fixme` — o objetivo é destravar, não esconder.

## Riscos

- Test data órfã em produção acumula se você rodar + reiniciar várias vezes. Cleanup SQL acima.
- Test DM account (`E2E_DM_EMAIL=danielroscoe97@gmail.com` em `.env.e2e`) é a **conta pessoal
  da Dani**. Comment em `e2e/fixtures/test-accounts.ts` diz "Never use danielroscoe97@gmail.com
  in destructive tests" — mas `.env.e2e` faz exatamente isso. Risco: test failures podem
  criar/corromper data na conta dela.
  - **Mitigação sugerida:** mudar `.env.e2e` pra `E2E_DM_EMAIL=dm.primary@test-pocketdm.com`
    (conta seeded pelo `scripts/seed-test-accounts.ts`) + atualizar helpers se referenciam
    via env var.

## Commit convention

```bash
rtk git commit --only -m "fix(e2e): restore helper testids after combat-session refactor — destrava Playwright suite" \
  e2e/helpers/session.ts
  # + outros helpers se tiveram drift
```

## Deliverable

- Playwright suite Wave 3 roda 7/7 desktop-chrome
- Suites adjacentes (features/, auth/, combat/) sem regressão
- Testid contract doc atualizado se mudanças permanentes feitas
- PR com descrição detalhando quais testids drift'aram + fix aplicado

## Estimativa

2-4h (depende de quantos testids drift'aram + quão recent é o refactor combat-session).

## Kickoff message pra nova sessão

```
Li docs/prompt-fix-e2e-helper-drift.md. Confirmei via `rtk git status` que WIP em
combat/new + CombatSessionClient já foi commitada — master tip <SHA>.

Plano:
1. Audit testids em e2e/helpers/session.ts
2. Grep prod pra identificar drift
3. Atualizar helper (ou restaurar testid em prod se mais simples)
4. Rodar dismissal-memory.spec.ts como canônico
5. Rodar suite completa Wave 3 + adjacentes pra confirmar no regression

Começando pelo audit dos testids.
```
