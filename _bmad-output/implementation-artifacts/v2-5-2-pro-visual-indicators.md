# Story 5.2: Pro Visual Indicators

Status: done

## Story

As a **Free user**,
I want to see which features are Pro-only, indicated by a lock icon and tooltip,
so that I understand what is available and what requires an upgrade.

## Acceptance Criteria

1. `ProBadge` component: Lock icon + "Pro" label. Tooltip on hover/focus: "Disponível no plano Pro". Gold color (#D4A853). Accessible: `aria-label`, keyboard focusable.
2. `ProGate` wrapper: if Pro → render children. If Free → render ProBadge instead. Content NOT rendered (not just hidden).
3. ProGate applied to 8 features: persistent_campaigns, saved_presets, export_data, homebrew, session_analytics, cr_calculator, file_sharing, email_invites.
4. Click on ProBadge triggers upsell (Story 5.3). Analytics event: `pro_badge_click { feature: flagKey }`.
5. All texts localized via i18n.
6. Consistent across ALL surfaces: compendium, combat, search, command palette.

## Tasks / Subtasks

- [ ] Task 1: ProBadge component (AC: #1, #5)
  - [ ] `components/billing/ProBadge.tsx`
  - [ ] Lock icon (`aria-hidden="true"`) + "Pro" text
  - [ ] Tooltip: `pro.badge.tooltip`
  - [ ] Gold color, semitransparent background
  - [ ] Keyboard focusable, `aria-label`

- [ ] Task 2: ProGate component (AC: #2)
  - [ ] `components/billing/ProGate.tsx`
  - [ ] Uses `useFeatureGate(flagKey)` internally
  - [ ] Pro → render `{children}`. Free → render `<ProBadge />`

- [ ] Task 3: Apply to 8 features (AC: #3, #6)
  - [ ] Wrap each feature's entry point with ProGate
  - [ ] Verify on all surfaces (compendium, combat, search, command palette)

- [ ] Task 4: Click → upsell (AC: #4)
  - [ ] ProBadge onClick: trigger upsell modal (Story 5.3)
  - [ ] Track analytics: `pro_badge_click`

## Dev Notes

### Files to Create/Modify
- New: `components/billing/ProBadge.tsx`, `components/billing/ProGate.tsx`
- Modify: 8+ feature components to wrap with ProGate

### i18n Keys
- `pro.badge.label`: "Pro"
- `pro.badge.tooltip`: "Disponível no plano Pro"
- `pro.badge.tooltip_description`: "Funcionalidade exclusiva do plano Pro"

### Anti-Patterns
- **DON'T** just hide content with CSS — don't render it at all for Free users
- **DON'T** use different ProBadge styles on different surfaces — must be consistent
- **DON'T** make badge intrusive — small, discrete, non-blocking

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.2]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, FR57, FR61]

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
- components/billing/ProBadge.tsx
- components/billing/ProGate.tsx
