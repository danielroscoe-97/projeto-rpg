# Code Review Session — 2026-04-05

> **Escopo:** Epic User Journey Onboarding (JO-01 a JO-15)
> **Base diff:** `f8393e9` (antes do Sprint 1) → `HEAD`
> **Grupos revisados nesta sessão:** Grupo 3 (completo) + patches colaterais de Grupos 2 e 4
> **Commits gerados:** `4a27468`, `5dd6695`, `c3aff1d`

---

## Grupo 3 — CombatRecap / RecapActions (JO-04) ✅ APROVADO

**Arquivos:** `components/combat/CombatRecap.tsx`, `components/combat/RecapActions.tsx`
**Doc detalhado:** [code-review-grupo3-combat-recap.md](code-review-grupo3-combat-recap.md)

### O que foi revisado

Adição da prop `onJoinCampaign?: () => void` no recap pós-combate — CTA para player anônimo entrar na campanha após o combate (JO-04).

### Resultado

Nenhum bug. Parity check passou:
- **Guest** — `GuestCombatClient` não precisa da prop (sem `sessionCampaignId`) ✅
- **Anônimo** — guard `!authUserId && !!sessionCampaignId` correto ✅
- **Autenticado** — excluído corretamente (`authUserId` truthy) ✅

---

## Patches Colaterais Identificados e Aplicados

### P-G3-01 — ICU escape em `checklist_progress` (i18n)

**Arquivo:** `messages/en.json`, `messages/pt-BR.json`
**Commit:** `4a27468`

**Problema:** `"{done}/{total} complete"` — next-intl interpreta como variáveis ICU, mas `t("checklist_progress")` é chamado sem parâmetros em `app/app/dashboard/page.tsx`.

**Fix:**
```json
- "checklist_progress": "{done}/{total} complete"
+ "checklist_progress": "'{done}/{total}' complete"
```

**Por quê funciona:** Single quotes em ICU escapam os `{}` → next-intl retorna o literal `{done}/{total} complete` → `ActivationChecklist.tsx:95` faz `.replace()` manual na string resultante.

---

### P-G2-01 — sessionStorage não pode bypassar `role` step (OnboardingWizard)

**Arquivo:** `components/dashboard/OnboardingWizard.tsx`
**Commit:** `5dd6695`

**Problema:** Se um usuário sem role definida (`userRole = null`) tinha um `step` salvo no sessionStorage diferente de `"role"`, o wizard pulava o step de role e ia direto para o step salvo.

**Fix:**
```ts
- if (ss?.step && ss.step !== "done") return ss.step as WizardStep;
+ if (ss?.step && ss.step !== "done") {
+   // P6: sessionStorage also must not bypass role step for users with no role
+   if (!userRole && ss.step !== "role") return "role";
+   return ss.step as WizardStep;
+ }
```

**Impacto:** JO-05 (role step para usuários legados sem role definida).

---

### P-G4-01 — Player tour usa selector errado como sinal de "página pronta"

**Arquivo:** `components/tour/DashboardTourProvider.tsx`
**Commit:** `5dd6695`

**Problema:** O tour aguardava `[data-tour-id="dash-quick-actions"]` como indicador de que o conteúdo do dashboard estava renderizado. Mas `dash-quick-actions` é um elemento DM-only — players nunca o veriam, causando timeout de 8s no tour do player.

**Fix:**
```ts
- const CONTENT_READY_SELECTOR = '[data-tour-id="dash-quick-actions"]';
+ const CONTENT_READY_SELECTOR = isPlayerFirstCampaign
+   ? '[data-tour-id="dash-player-campaigns"]'
+   : '[data-tour-id="dash-quick-actions"]';
```

**Impacto:** JO-12 (player tour). Tour do player agora detecta prontidão corretamente.

---

### P-G4-02 — Remoção de chave i18n stale (`go_to_dashboard`)

**Arquivo:** `messages/en.json`
**Commit:** `5dd6695`

Chave `go_to_dashboard` removida do namespace `onboarding` em `en.json` (já havia sido removida em `pt-BR.json`). Não causava erro mas gerava inconsistência entre os locales.

---

## E2E — Melhoria nos testes de token survival

**Arquivo:** `e2e/onboarding/sprint1-token-survival.spec.ts`
**Commit:** `c3aff1d`

- Substituídos `waitForTimeout` por polling via `waitForFunction` — elimina flakiness por timing
- Assertions de formato JSON em vez de string matching em payloads de beacon
- +29 linhas, -12 linhas

---

## Estado do Repo após esta sessão

| Grupo | Arquivos | Status |
|-------|---------|--------|
| Grupo 1 — Auth/Onboarding Flow | 5 arquivos, 8 patches | ✅ Revisado + deployado (`a6ac360`) |
| Grupo 2 — Dashboard + OnboardingWizard | Parcial (P-G2-01) | 🟡 Pendente revisão completa |
| Grupo 3 — CombatRecap / RecapActions | 2 arquivos | ✅ Aprovado + deployado (`4a27468`) |
| Grupo 4 — Tour + i18n + Layout | Parcial (P-G4-01, P-G4-02) | 🟡 Pendente revisão completa |
| Grupo 5 — E2E | Melhorias aplicadas | 🟡 Pendente revisão completa |
