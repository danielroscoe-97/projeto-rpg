# Story 5.7: Subscription Management Panel

Status: done

## Story

As a **DM**,
I want to view and manage my subscription in the settings,
so that I can see my current plan, renewal date, upgrade, or cancel.

## Acceptance Criteria

1. Settings → "Plano" panel shows: current plan (Free/Pro/Trial Pro), renewal date or trial days remaining, CTA based on plan.
2. Pro active: "Gerenciar Assinatura" → Stripe Customer Portal (update card, change plan, cancel).
3. Trial active: "Trial Pro — X dias restantes" + progress bar + "Assinar para continuar" CTA.
4. Free: "Plano Gratuito" + Pro features list (locked) + "Iniciar Trial Grátis"/"Assinar Pro" CTA. Prices shown.
5. After cancel via Stripe Portal: "Plano Pro — Cancela em {data}". Features active until `current_period_end`.
6. "Histórico de Pagamentos" → Stripe Customer Portal invoices section.
7. All texts localized via i18n.

## Tasks / Subtasks

- [ ] Task 1: SubscriptionPanel component (AC: #1)
  - [ ] `components/billing/SubscriptionPanel.tsx`
  - [ ] Load from `subscriptions` table via `user_id = auth.uid()`
  - [ ] Conditional rendering based on plan/status

- [ ] Task 2: Stripe Customer Portal integration (AC: #2, #6)
  - [ ] API route: `stripe.billingPortal.sessions.create({ customer, return_url })`
  - [ ] "Gerenciar Assinatura" and "Histórico de Pagamentos" buttons

- [ ] Task 3: Trial view (AC: #3)
  - [ ] Days remaining calculation
  - [ ] Progress bar
  - [ ] CTA to checkout

- [ ] Task 4: Free view (AC: #4)
  - [ ] Feature list with lock indicators
  - [ ] Trial/Subscribe CTAs
  - [ ] Prices: R$14,90/mês, R$119,90/ano

- [ ] Task 5: Cancel state (AC: #5)
  - [ ] "Cancela em {date}" display
  - [ ] Features active until period end

## Dev Notes

### Files to Create
- New: `components/billing/SubscriptionPanel.tsx`
- New: `/app/settings/billing/page.tsx` or settings tab
- API route for Stripe Customer Portal session creation

### i18n Keys
- `billing.plan.free`, `billing.plan.pro`, `billing.plan.trial`
- `billing.renewal_date`, `billing.trial_days_left`
- `billing.manage`, `billing.history`, `billing.upgrade_cta`, `billing.trial_cta`

### Anti-Patterns
- **DON'T** build custom payment management — use Stripe Customer Portal
- **DON'T** show stale subscription data — query on page load

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.7]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5]

## Dev Agent Record
### Agent Model Used
Claude Opus 4.6 (Stream B, Agent 2)

### Completion Notes List
- Status: DONE — implemented, build passing, CR fixes applied, migrations deployed
- All features open to everyone (plan_required = 'free') — monetization deferred
- Code reviewed: 3 CRITICAL + 4 HIGH + 3 MEDIUM issues found and fixed

### Change Log
- 2026-03-27: Initial implementation
- 2026-03-27: Code review fixes (trial race condition, RLS policy, webhook error handling, open redirect, status mapping)
- 2026-03-27: Migrations applied to Supabase remote

### File List
- components/billing/SubscriptionPanel.tsx
- app/api/billing-portal/route.ts
- components/settings/SettingsClient.tsx (modified)
