# Sprint 1 Code Review — Findings para Fix

> **Commit:** `2c10277` — feat(onboarding): Sprint 1 — token survival + Join Campaign CTA (JO-01/02/03/04)
> **Data do review:** 2026-04-05
> **Status:** Pendente fix

---

## Findings a corrigir (5 patches)

### S1-BH-01 (MEDIUM) — `joinCampaignDirectAction` sem validação UUID

**Arquivo:** `app/app/dashboard/actions.ts` (linha ~12)

**Problema:** O `campaignId` vem do `localStorage` (controlado pelo client). Embora Supabase parametrize a query, não há validação de formato UUID antes de enviar para o DB.

**Fix sugerido:**
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(campaignId)) return { success: false, error: "invalid_campaign" };
```

---

### S1-EC-02 (MEDIUM) — `pendingInvite` stale no localStorage (sem TTL/cleanup)

**Arquivo:** `components/sign-up-form.tsx` (useEffect ~linhas 46-62)

**Problema:** Se o user chega na sign-up sem contexto (generic) mas tem um `pendingInvite` antigo no localStorage de sessão anterior, o DashboardOverview vai redirecionar para um invite possivelmente expirado.

**Fix sugerido:** Na sign-up page, se o contexto é `generic`:
```ts
// Clean stale pending tokens when arriving without context
if (signupContextType === "generic") {
  localStorage.removeItem("pendingInvite");
  localStorage.removeItem("pendingJoinCode");
  localStorage.removeItem("pendingCampaignJoin");
}
```

Alternativa: adicionar TTL ao item salvo (`savedAt: Date.now()`) e ignorar se > 24h.

---

### S1-BH-02 (LOW) — DM pode entrar na própria campanha como player

**Arquivo:** `app/app/dashboard/actions.ts` (linhas ~22-27)

**Problema:** A action verifica se a campanha existe mas não checa se `user.id === campaign.owner_id`. O DM poderia ser adicionado como player na própria campanha.

**Fix sugerido:**
```ts
if (campaign.owner_id === user.id) return { success: true, alreadyMember: true };
```

---

### S1-BH-04 (LOW) — i18n key `role_save_error` duplicada

**Arquivo:** `messages/en.json` (e possivelmente `pt-BR.json`)

**Problema:** A key `role_save_error` aparece duplicada dentro do namespace `onboarding`. Dependendo do parser, uma será ignorada.

**Fix:** Buscar com `grep -n "role_save_error"` e remover a duplicata.

---

### S1-EC-01 (LOW) — IIFE async no useEffect sem cleanup flag

**Arquivo:** `components/dashboard/DashboardOverview.tsx` (linhas ~136-155)

**Problema:** O `useEffect` para `pendingCampaignJoin` executa IIFE async sem flag de cleanup. Se o componente desmonta antes da promise resolver, `toast.success()` e `router.refresh()` executam em componente desmontado.

**Fix sugerido:**
```ts
useEffect(() => {
  let cancelled = false;
  // ... no início da IIFE async
  if (cancelled) return; // antes de toast/router.refresh
  return () => { cancelled = true; };
}, [...]);
```

---

## Findings deferidos (2)

- **S1-BH-03**: `context=campaign_join` não sobrevive ao email+password confirm flow cross-device. O localStorage fallback cobre o caso principal (same browser).
- **S1-EC-03**: `GoogleOAuthButton` `redirectTo` com `window.location.origin` no SSR — pattern frágil mas pré-existente e compensado pelo `"use client"`.

---

## Critérios de aceite

- [ ] S1-BH-01: Validar UUID no `joinCampaignDirectAction`
- [ ] S1-EC-02: Limpar localStorage stale na sign-up generic
- [ ] S1-BH-02: Bloquear DM de entrar na própria campanha como player
- [ ] S1-BH-04: Remover key i18n duplicada
- [ ] S1-EC-01: Adicionar cleanup flag no useEffect async
- [ ] Build passando: `rtk next build`
