# Story 5.6: Stripe Payment Integration

Status: done

## Story

As a **DM**,
I want to subscribe to the Pro plan using a secure payment flow,
so that I can unlock all Pro features with a monthly or annual subscription.

## Acceptance Criteria

1. "Assinar Pro" button creates Stripe Checkout session via `/api/checkout`. DM redirected to Stripe hosted checkout. Prices: R$14,90/mês, R$119,90/ano.
2. Webhook `checkout.session.completed`: `/api/webhooks/stripe` updates `subscriptions` — `status='active'`, `stripe_subscription_id`, `stripe_customer_id`, `current_period_end`. Features unlocked.
3. Webhook `customer.subscription.updated`: reflects plan changes.
4. Webhook `customer.subscription.deleted`: `status='canceled'`. Features blocked (respecting graceful degradation).
5. Webhook signature validated via `stripe.webhooks.constructEvent()`. Invalid → 400.
6. `/api/checkout` requires auth. `success_url` → `/app/settings/billing?success=true`. `cancel_url` → `?canceled=true`.
7. Trial→paid transition: `status` changes from 'trialing' to 'active' seamlessly.

## Tasks / Subtasks

- [ ] Task 1: Checkout API route (AC: #1, #6)
  - [ ] Create `app/api/checkout/route.ts`
  - [ ] Auth required
  - [ ] Create Stripe Checkout session with price IDs from env vars
  - [ ] success_url, cancel_url

- [ ] Task 2: Webhook handler (AC: #2, #3, #4, #5)
  - [ ] Create `app/api/webhooks/stripe/route.ts`
  - [ ] Validate signature with `STRIPE_WEBHOOK_SECRET`
  - [ ] Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - [ ] Update `subscriptions` table accordingly

- [ ] Task 3: Trial→paid transition (AC: #7)
  - [ ] On checkout complete: if existing trial, update status to 'active'

- [ ] Task 4: Environment variables
  - [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - [ ] `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`

## Dev Notes

### Files to Create
- New: `app/api/checkout/route.ts`
- New: `app/api/webhooks/stripe/route.ts`
- Modify: `subscriptions` table updates

### Stripe SDK
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### Anti-Patterns
- **DON'T** hardcode price IDs — use env vars
- **DON'T** skip webhook signature validation — security critical
- **DON'T** store card details — Stripe Checkout handles PCI compliance

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.6]
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
- lib/stripe.ts
- app/api/checkout/route.ts
- app/api/webhooks/stripe/route.ts
