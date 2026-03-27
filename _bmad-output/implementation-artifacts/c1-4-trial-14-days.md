# Story C.1.4: Trial 14 Dias

Status: ready-for-dev

## Story

As a **new DM**,
I want a 14-day free trial of Pro features,
so that I can evaluate before committing.

## Acceptance Criteria

1. New accounts automatically get 14-day trial
2. Trial status shown in UI: "Trial: X dias restantes" / "Trial: X days remaining"
3. Trial expiry handled by Trigger.dev cron job (check daily)
4. 3 days before expiry: email notification via Novu
5. On expiry: features downgrade to free (not hard block — graceful degradation)
6. DM can upgrade to paid any time during trial
7. Trial only once per account

## Tasks / Subtasks

- [ ] Task 1: Auto-trial on signup (AC: #1, #7)
- [ ] Task 2: Trial status UI (AC: #2)
- [ ] Task 3: Expiry cron job (AC: #3)
- [ ] Task 4: Expiry email (AC: #4)
- [ ] Task 5: Graceful degradation (AC: #5)
- [ ] Task 6: Upgrade during trial (AC: #6)
- [ ] Task 7: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `app/api/trial/` — complete
- Modify: `lib/stores/subscription-store.ts` — trial status
- Modify: `components/billing/` — trial banner

### Anti-Patterns

- **DON'T** hard-block on trial expiry — downgrade gracefully
- **DON'T** allow multiple trials per account

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-4-free-trial-14-days.md]
- Dependencies: C.1.1, C.1.2

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
