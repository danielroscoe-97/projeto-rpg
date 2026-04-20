# E2E Test Plan — Release 2026-04-20

> **Escopo:** validar as 8 ondas do release via Playwright contra produção (`pocketdm.com.br`)
> **Infra existente:**
> - `playwright.config.ts` — `BASE_URL` env var chaveia remote vs local (webServer `npm run dev`)
> - `e2e/fixtures/test-accounts.ts` — 10 contas (3 DMs + 7 Players)
> - `scripts/seed-test-accounts.ts` — seed idempotente via Supabase service role
> - Helpers: `e2e/helpers/{auth,campaign-seed,combat,db,multi-player,session}.ts`

---

## 🎯 Estratégia

1. **Rodar specs existentes** (cobertura legada: auth, combat, compendium, sessions, journeys)
2. **Criar 4 specs novos** pra features do release que não têm cobertura:
   - `e2e/release/briefing.spec.ts` — Onda 2a
   - `e2e/release/sidebar-flag.spec.ts` — Onda 2b (com flag ON)
   - `e2e/release/notes-visibility.spec.ts` — Onda 4 (E2E player→DM)
   - `e2e/release/auto-invite.spec.ts` — Onda 5 (DM dispatch + player toast)
3. **Ordem de execução** — sequential (workers=1), retry 1x em CI
4. **Comando padrão:**
   ```
   BASE_URL=https://pocketdm.com.br rtk npx playwright test <spec>
   ```

---

## 🧪 Contas necessárias

Todas já existem em `e2e/fixtures/test-accounts.ts`:

| Conta | UUID | Uso |
|---|---|---|
| `DM_PRIMARY` | `0c1d188f...` | Mestre principal PT-BR |
| `DM_PRO` | `d493fb17...` | Mestre 2 PT-BR (cross-campaign tests) |
| `DM_ENGLISH` | `937aec78...` | Mestre EN (i18n) |
| `PLAYER_WARRIOR` | — | Player PT-BR |
| `PLAYER_MAGE` | — | Player PT-BR (2nd no dual-player tests) |
| `PLAYER_HEALER` | — | Player PT-BR |
| `PLAYER_ENGLISH` | — | Player EN |
| `PLAYER_FRESH` | — | Player sem campanhas (onboarding) |
| `PLAYER_AUDIO` | — | Audio tests |
| `PLAYER_TRIAL` | — | Trial expirado |

**Se conta faltar:** `rtk npx tsx scripts/seed-test-accounts.ts` (idempotente).

---

## 📋 Suite 1 — Smoke existente (validação de regressão)

Specs que DEVEM passar em produção. Executar primeiro — se qualquer falhar, é regressão.

### Comando
```
BASE_URL=https://pocketdm.com.br rtk npx playwright test \
  e2e/features/qa-login-check.spec.ts \
  e2e/auth/ \
  e2e/compendium-anon-gating.spec.ts
```

### Specs-alvo
- `e2e/features/qa-login-check.spec.ts` — login DM → redirect pra `/app/`
- `e2e/auth/**` — fluxos de auth (login, signup, password reset)
- `e2e/compendium-anon-gating.spec.ts` — anon tem acesso SRD mas não paywall
- `e2e/journeys/j3-dm-returns.spec.ts` — DM volta à campanha (login + navegação pós fix keyboard bubble)
- `e2e/journeys/j15-comprehensive-qa-sweep.spec.ts` — sweep global (todas rotas `/app/*` respondem)
- `e2e/combat/**` — combat seed + start (Combat Parity auth)

**Critério:** taxa de aprovação ≥ baseline antes do release. Qualquer falha nova = regressão.

---

## 📋 Suite 2 — Specs novos a criar

### 2.1 `e2e/release/briefing.spec.ts` — Onda 2a (Dashboard Briefing)

```ts
// Cobre F10: "Hoje na sua mesa"
import { test, expect } from "@playwright/test";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import { loginAs } from "../helpers/auth";
import { seedCampaignWithOnboarding } from "../helpers/campaign-seed";

test.describe("Onda 2a — Campaign Dashboard Briefing", () => {
  test("DM vê briefing completo após onboarding", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    const campaignId = await seedCampaignWithOnboarding(DM_PRIMARY.uuid);
    await page.goto(`/app/campaigns/${campaignId}`);

    // Hero com status badge
    await expect(page.locator("[data-testid='briefing-status-badge']")).toBeVisible();

    // Seção "Hoje na sua mesa"
    await expect(page.getByText(/hoje na sua mesa/i)).toBeVisible();

    // Timeline (pode estar vazia em campanha nova)
    await expect(page.locator("[data-testid='briefing-activity-timeline']")).toBeVisible();

    // Mini mind-map (fallback quando < 5 edges)
    await expect(page.getByText(/teia ainda não foi tecida|tecendo a teia/i)).toBeVisible();

    // Pulse stats — 6 contadores
    const pulseStats = page.locator("[data-testid='briefing-pulse-stats']");
    await expect(pulseStats).toBeVisible();
  });

  test("Combate ativo mostra halo dourado + CTA Entrar", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    const campaignId = await seedCampaignWithActiveCombat(DM_PRIMARY.uuid);
    await page.goto(`/app/campaigns/${campaignId}`);

    // Status badge vermelho
    const badge = page.locator("[data-testid='briefing-status-badge']");
    await expect(badge).toHaveAttribute("data-status", "active_combat");

    // Halo dourado no card "Hoje"
    const todayCard = page.locator("[data-testid='briefing-today']");
    await expect(todayCard).toHaveCSS("box-shadow", /amber|200.*160.*80/i);

    // CTA "Entrar no combate"
    const cta = page.getByRole("button", { name: /entrar no combate/i });
    await expect(cta).toBeVisible();
  });

  test("Cards antigos (grid decorativo) NÃO aparecem mais", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    const campaignId = await seedCampaignWithOnboarding(DM_PRIMARY.uuid);
    await page.goto(`/app/campaigns/${campaignId}`);

    // CampaignGrid está deprecated — não deve renderizar
    await expect(page.locator("[data-testid='campaign-grid']")).toHaveCount(0);
  });

  test("Player view INTOCADA", async ({ page }) => {
    await loginAs(page, PLAYER_WARRIOR);
    // Player continua vendo CampaignPlayerViewServer (sem briefing)
    await page.goto(`/app/campaigns/${SHARED_CAMPAIGN_ID}`);
    await expect(page.locator("[data-testid='player-view']")).toBeVisible();
    await expect(page.locator("[data-testid='campaign-briefing']")).toHaveCount(0);
  });
});
```

### 2.2 `e2e/release/sidebar-flag.spec.ts` — Onda 2b (Feature Flag ON)

```ts
// Cobre F13: sidebar esquerda + Quick Switcher universal
// Requer NEXT_PUBLIC_FEATURE_NEW_SIDEBAR=true em prod

test.describe("Onda 2b — Navigation Redesign (flag ON)", () => {
  test("sidebar esquerda visível em /app/dashboard", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard");
    await expect(page.locator("[data-testid='app-sidebar']")).toBeVisible();

    // Navbar top antiga NÃO aparece
    await expect(page.locator("[data-testid='navbar-with-sync']")).toHaveCount(0);
  });

  test("Ctrl+B toggle collapse persiste em localStorage", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard");
    await page.keyboard.press("Control+B");
    await expect(page.locator("[data-testid='app-sidebar']")).toHaveAttribute("data-collapsed", "true");

    // Reload — persist
    await page.reload();
    await expect(page.locator("[data-testid='app-sidebar']")).toHaveAttribute("data-collapsed", "true");
  });

  test("Ctrl+K abre Quick Switcher com 5 grupos", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard");
    await page.keyboard.press("Control+K");

    const palette = page.locator("[role='dialog'][aria-label='Quick switcher'], [cmdk-root]");
    await expect(palette).toBeVisible();

    // Grupos visíveis
    await expect(page.getByText(/ações/i).first()).toBeVisible();
    await expect(page.getByText(/campanhas/i).first()).toBeVisible();
    await expect(page.getByText(/personagens/i).first()).toBeVisible();
  });

  test("Chord 'g d' navega pra dashboard (fora de input)", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard/campaigns");
    await page.keyboard.press("g");
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/app\/dashboard$/);
  });

  test("Chord 'g d' NÃO dispara dentro de input", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard/campaigns?new=1");
    const input = page.locator("input[name='name']").first();
    await input.click();
    await input.fill("gd test");
    await expect(page).toHaveURL(/\/campaigns\?new=1$/); // NÃO navegou
  });

  test("Guest /try NÃO usa AppSidebar (Combat Parity)", async ({ page }) => {
    await page.goto("/try");
    await expect(page.locator("[data-testid='app-sidebar']")).toHaveCount(0);
    // PublicNav ainda funciona
    await expect(page.locator("nav")).toBeVisible();
  });
});
```

### 2.3 `e2e/release/notes-visibility.spec.ts` — Onda 4 (F01/F02)

```ts
// Cobre F01 + F02: player compartilha notas + DM cria privada pra player

import { multiPlayerTest } from "../helpers/multi-player";

multiPlayerTest.describe("Onda 4 — Notes Visibility E2E", () => {
  multiPlayerTest("Player compartilha quick note → DM vê no Inspector",
    async ({ dmPage, playerAPage }) => {
      // Setup: DM cria campanha + player joina
      const campaign = await setupSharedCampaign(dmPage, playerAPage);

      // Player: Player HQ → QuickNote → toggle shared
      await playerAPage.goto(`/app/campaigns/${campaign.id}/sheet`);
      await playerAPage.click("[data-testid='tab-notes']");
      await playerAPage.click("[data-testid='quick-note-new']");
      await playerAPage.fill("[data-testid='quick-note-input']", "Secret lore I learned");
      await playerAPage.click("[data-testid='quick-note-save']");

      // Toggle visibility
      const toggleBtn = playerAPage.locator("[data-testid='visibility-toggle']").first();
      await toggleBtn.click();
      await expect(playerAPage.getByText(/visível ao mestre/i)).toBeVisible();

      // DM: Campaign HQ → section player-notes
      await dmPage.goto(`/app/campaigns/${campaign.id}?section=player-notes`);
      await expect(dmPage.getByText("Secret lore I learned")).toBeVisible();
  });

  multiPlayerTest("DM cria nota privada pra player A — player B NÃO vê",
    async ({ dmPage, playerAPage, playerBPage }) => {
      const campaign = await setupSharedCampaign(dmPage, playerAPage, playerBPage);

      // DM envia nota privada pro player A
      await dmPage.goto(`/app/campaigns/${campaign.id}?section=player-notes`);
      await dmPage.click(`[data-testid='new-private-note-${PLAYER_A.character_id}']`);
      await dmPage.fill("[data-testid='private-note-title']", "For your eyes only");
      await dmPage.fill("[data-testid='private-note-content']", "The real villain is...");
      await dmPage.click("[data-testid='private-note-save']");

      // Player A: vê no inbox
      await playerAPage.goto(`/app/campaigns/${campaign.id}/sheet`);
      await playerAPage.click("[data-testid='tab-notes']");
      await playerAPage.click("[data-testid='sub-tab-dm-inbox']");
      await expect(playerAPage.getByText("For your eyes only")).toBeVisible();

      // Player B: NÃO vê
      await playerBPage.goto(`/app/campaigns/${campaign.id}/sheet`);
      await playerBPage.click("[data-testid='tab-notes']");
      await playerBPage.click("[data-testid='sub-tab-dm-inbox']");
      await expect(playerBPage.getByText("For your eyes only")).toHaveCount(0);
  });

  multiPlayerTest("RLS: DM NÃO vê notas private de player", async ({ dmPage, playerAPage }) => {
    const campaign = await setupSharedCampaign(dmPage, playerAPage);

    // Player cria nota PRIVATE (sem toggle shared)
    await playerAPage.goto(`/app/campaigns/${campaign.id}/sheet`);
    await playerAPage.click("[data-testid='tab-notes']");
    await playerAPage.click("[data-testid='quick-note-new']");
    await playerAPage.fill("[data-testid='quick-note-input']", "My private secret");
    await playerAPage.click("[data-testid='quick-note-save']");

    // DM tenta ver: não deve encontrar
    await dmPage.goto(`/app/campaigns/${campaign.id}?section=player-notes`);
    await expect(dmPage.getByText("My private secret")).toHaveCount(0);
  });
});
```

### 2.4 `e2e/release/auto-invite.spec.ts` — Onda 5 (F19)

```ts
// Cobre F19: DM inicia combate → player logado recebe toast auto

multiPlayerTest.describe("Onda 5 — Auto-Invite Combat", () => {
  multiPlayerTest("Player em /app/dashboard recebe toast quando DM inicia combate",
    async ({ dmPage, playerAPage }) => {
      const campaign = await setupSharedCampaign(dmPage, playerAPage);

      // Player em dashboard (logado, não no combate)
      await playerAPage.goto("/app/dashboard");

      // DM inicia combate
      await dmPage.goto(`/app/campaigns/${campaign.id}`);
      await dmPage.click("[data-testid='start-combat']");
      await dmPage.click("[data-testid='quick-start-confirm']");

      // Player recebe toast em < 5s (buffer generoso)
      const toast = playerAPage.locator("[data-testid='combat-invite-toast']");
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText(/iniciou o combate/i);

      // CTA Entrar navega
      await toast.getByRole("button", { name: /entrar/i }).click();
      await expect(playerAPage).toHaveURL(/\/join\//);
  });

  multiPlayerTest("DM NÃO recebe próprio toast", async ({ dmPage, playerAPage }) => {
    const campaign = await setupSharedCampaign(dmPage, playerAPage);
    await dmPage.goto("/app/dashboard");

    // DM inicia combate em aba separada
    const dmCombatPage = await dmPage.context().newPage();
    await dmCombatPage.goto(`/app/campaigns/${campaign.id}`);
    await dmCombatPage.click("[data-testid='start-combat']");

    // DM na aba dashboard NÃO recebe toast
    await dmPage.waitForTimeout(3000);
    await expect(dmPage.locator("[data-testid='combat-invite-toast']")).toHaveCount(0);
  });

  multiPlayerTest("Quick Combat (sem campanha) NÃO dispara invite",
    async ({ dmPage, playerAPage }) => {
      await playerAPage.goto("/app/dashboard");
      await dmPage.goto("/app/combat/new");
      await dmPage.click("[data-testid='quick-combat-start']");

      // Sem campaign_id → server retorna 204 → nada dispara
      await playerAPage.waitForTimeout(3000);
      await expect(playerAPage.locator("[data-testid='combat-invite-toast']")).toHaveCount(0);
  });

  multiPlayerTest("Player offline ao iniciar → vê notificação ao voltar",
    async ({ dmPage, playerAPage }) => {
      const campaign = await setupSharedCampaign(dmPage, playerAPage);

      // Player fecha aba
      await playerAPage.close();

      // DM inicia combate
      await dmPage.goto(`/app/campaigns/${campaign.id}`);
      await dmPage.click("[data-testid='start-combat']");
      await dmPage.click("[data-testid='quick-start-confirm']");

      // Player volta (nova página)
      const newPlayerPage = await context.newPage();
      await loginAs(newPlayerPage, PLAYER_WARRIOR);
      await newPlayerPage.goto("/app/dashboard");

      // NotificationBell tem badge
      const bell = newPlayerPage.locator("[data-testid='notification-bell']");
      await expect(bell.locator("[data-testid='bell-badge']")).toBeVisible();

      // Clica bell → vê convite
      await bell.click();
      await expect(newPlayerPage.getByText(/iniciou o combate/i)).toBeVisible();
  });
});
```

---

## 📋 Suite 3 — Combat Parity (CRÍTICA)

Rodar os 3 modos em sequência pra confirmar parity preservada:

```
BASE_URL=https://pocketdm.com.br rtk npx playwright test \
  e2e/combat/guest-try.spec.ts \
  e2e/combat/anon-join.spec.ts \
  e2e/combat/auth-invite.spec.ts
```

**Critério:** todos 3 passam. Se qualquer falhar, é regressão crítica.

---

## 📋 Suite 4 — Visual Regression (opcional)

Se tempo permitir, snapshot tests:
```
BASE_URL=https://pocketdm.com.br rtk npx playwright test e2e/visual/
```

Comparar screenshots com baseline. Divergências grandes ⇒ bug UI.

---

## 🔧 Setup pré-execução

### 1. Verificar env vars locais
```bash
# .env.local deve ter:
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Seed de contas (idempotente)
```bash
rtk npx tsx scripts/seed-test-accounts.ts
```

### 3. Se contas estiverem corrompidas (opcional):
```bash
rtk npx tsx scripts/reset-fresh-accounts.ts
```

### 4. Cleanup pós-testes (opcional, evita lixo):
```bash
# Testes devem ser idempotentes, mas se precisar limpar campanhas de teste:
# SQL via Supabase SQL Editor:
# DELETE FROM campaigns WHERE owner_id IN (SELECT uuid FROM test_accounts);
```

---

## 🏃 Plano de execução completo (tempo estimado)

| Passo | Comando | Tempo |
|---|---|---|
| 1. Seed | `rtk npx tsx scripts/seed-test-accounts.ts` | 30s |
| 2. Suite 1 (smoke existente) | `BASE_URL=... rtk npx playwright test e2e/features/ e2e/auth/` | 3-5min |
| 3. Suite 3 (Combat Parity) | idem, `e2e/combat/` | 3-5min |
| 4. Criar Specs novos | Claude Code (Agent) em paralelo | 1-2 sessões |
| 5. Suite 2 (novos specs) | `BASE_URL=... rtk npx playwright test e2e/release/` | 5-10min |
| 6. Visual regression | opcional | 3-5min |

**Total:** 15-30 min após seeding (Suite 1+2+3 rodando contra prod).

---

## ⚠️ Riscos & Mitigações

| Risco | Mitigação |
|---|---|
| Rate limit Supabase ao seedar 10 accounts | Script é idempotente (skip existentes) |
| Testes criam campanhas/combates em prod | Dedicado: `test_accounts` usam UUIDs fixos, cleanup opcional |
| RLS em prod pode divergir de dev | Rodar em prod é justamente o ponto — captura diferenças |
| Playwright timeout em redes lentas | Config já tem `90_000ms` quando `BASE_URL` set |
| Sessão de teste interfere com usuários reais | Contas `@test-taverna.com` / `@test-pocketdm.com` isoladas |

---

## 📊 Reporter

Após cada suite:
- **HTML report:** `e2e/results/index.html` (Playwright gera)
- **Screenshots/traces:** `e2e/results/test-results/` em falhas
- **Console logs:** copiar pro Slack / issue

Gates:
- **PASS** = 100% suites + ≤ 5% flakiness
- **WARN** = ≥ 90% + regressões em specs novos só
- **FAIL** = <90% OU qualquer spec legacy quebrado

---

## 🎬 Próximos passos (nesta ordem)

1. **Eu (Claude)** rodo Suite 1 contra prod AGORA (smoke existente)
2. **Eu (Claude)** crio os 4 specs novos em `e2e/release/`
3. **Eu (Claude)** rodo Suite 2 contra prod
4. **Humano** revisa resultados + decide se OK pra Entity Graph
