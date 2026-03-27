# Story C.1.3: Subscription Management Panel

Status: ready-for-dev

## Story

As a **DM**,
I want to view and manage my subscription,
so that I can see my plan, billing history, and cancel if needed.

## Acceptance Criteria

1. Settings page shows current plan (Free/Pro/Mesa) with status
2. "Manage Subscription" button opens Stripe Billing Portal
3. Billing portal allows: update payment method, view invoices, cancel
4. After portal changes, subscription status updates in app
5. Cancel flow shows retention messaging before redirecting to Stripe
6. i18n

## Tasks / Subtasks

- [ ] Task 1: Subscription status display (AC: #1)
- [ ] Task 2: Billing portal redirect (AC: #2, #3)
  - [ ] Use `/api/billing-portal` route
- [ ] Task 3: Status sync after portal (AC: #4)
- [ ] Task 4: Cancel retention message (AC: #5)
- [ ] Task 5: i18n (AC: #6)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/billing/` — subscription panel
- Modify: `app/api/billing-portal/` — complete
- Modify: `components/settings/SettingsClient.tsx` — integrate
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Anti-Patterns

- **DON'T** build custom billing management — use Stripe Billing Portal
- **DON'T** show raw Stripe data — present in user-friendly format

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-7-subscription-management-panel.md]
- Dependencies: C.1.2

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
