# Story C.1.6: Pro Visual Indicators + Upsell Contextual

Status: ready-for-dev

## Story

As a **free user**,
I want to see what Pro features exist and how to unlock them,
so that I'm motivated to upgrade.

## Acceptance Criteria

1. Gated features show lock badge icon
2. Clicking locked feature shows contextual upsell: what it does + "Upgrade" CTA
3. Pro features in DM view have subtle "PRO" badge
4. Upsell dialog is non-intrusive (no pop-ups, only on user action)
5. i18n

## Tasks / Subtasks

- [ ] Task 1: Lock badge component (AC: #1)
- [ ] Task 2: Upsell dialog (AC: #2, #4)
- [ ] Task 3: Pro badge (AC: #3)
- [ ] Task 4: i18n (AC: #5)

## Dev Notes

### Files to Modify/Create

- New: `components/billing/FeatureLockBadge.tsx`
- New: `components/billing/UpsellDialog.tsx`
- Modify: Various gated feature components

### Anti-Patterns

- **DON'T** use aggressive pop-ups or timers
- **DON'T** hide free features to push Pro

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-2-pro-visual-indicators.md]
- [Source: _bmad-output/implementation-artifacts/v2-5-3-contextual-upsell.md]
- Dependencies: C.1.1

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
