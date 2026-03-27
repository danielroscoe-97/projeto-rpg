# Story C.1.2: Stripe Checkout Flow Completo

Status: ready-for-dev

## Story

As a **DM**,
I want to subscribe to Pro via Stripe Checkout,
so that I can unlock premium features.

## Acceptance Criteria

1. "Upgrade to Pro" button in settings/dashboard
2. Redirects to Stripe Checkout with correct price ID
3. Success URL returns to app with subscription confirmed
4. Webhook handler (`/api/webhooks/stripe`) processes: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
5. Subscription status synced to `subscriptions` table
6. UI reflects subscription status immediately after return
7. Error handling for failed payments
8. Test mode with Stripe test keys

## Tasks / Subtasks

- [ ] Task 1: Complete checkout API route (AC: #1, #2, #3)
- [ ] Task 2: Complete webhook handler (AC: #4, #5)
- [ ] Task 3: Subscription store sync (AC: #6)
- [ ] Task 4: Error handling (AC: #7)
- [ ] Task 5: Test mode config (AC: #8)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `app/api/checkout/` — complete
- Modify: `app/api/webhooks/stripe/route.ts` — complete
- Modify: `lib/stores/subscription-store.ts` — sync after checkout
- Modify: `lib/stripe.ts` — complete
- Modify: `components/billing/` — complete

### Anti-Patterns

- **DON'T** trust client-side subscription status — always verify server-side via webhook
- **DON'T** store card details — Stripe handles all payment data
- **DON'T** skip webhook signature verification

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-6-stripe-payment-integration.md]
- Dependencies: C.1.1

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
