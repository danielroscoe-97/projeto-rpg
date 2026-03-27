# Story 5.3: Contextual Upsell

Status: done

## Story

As a **Free user**,
I want to see a contextual upsell when I try to use a Pro feature,
so that I understand the value of upgrading without feeling pressured by random popups.

## Acceptance Criteria

1. `UpsellCard` modal: "Desbloqueie {featureName}" title (dynamic per feature), 1-2 sentence benefit description, CTA "Iniciar Trial Grátis" (or "Ver Planos"), dismiss "Agora não". Centered, backdrop dimmed.
2. Max 1x per session per feature (sessionStorage: `upsell_shown_{flagKey}`).
3. NEVER shown as random popup — ALWAYS triggered by user action on Pro feature.
4. Analytics: `upsell_shown`, `upsell_clicked`, `upsell_dismissed` — each with `{ feature: flagKey }`.
5. "Iniciar Trial Grátis" → Story 5.4 trial flow. "Ver Planos" → `/pricing` or settings.
6. Each feature has unique localized description via i18n: `upsell.{flagKey}.title`, `upsell.{flagKey}.description`.

## Tasks / Subtasks

- [ ] Task 1: UpsellCard component (AC: #1, #6)
  - [ ] `components/billing/UpsellCard.tsx`
  - [ ] Dynamic title and description per flagKey
  - [ ] CTAs: trial (if available), plans, dismiss

- [ ] Task 2: Session dedup (AC: #2)
  - [ ] Check `sessionStorage.getItem('upsell_shown_{flagKey}')`
  - [ ] Set on show, don't show again for same feature in same session

- [ ] Task 3: Analytics events (AC: #4)
  - [ ] Track: shown, clicked, dismissed

- [ ] Task 4: Integration with ProBadge (AC: #3)
  - [ ] ProBadge click → open UpsellCard
  - [ ] ONLY triggered by user action

- [ ] Task 5: Feature descriptions (AC: #6)
  - [ ] i18n keys for each of 8 features
  - [ ] Example: `upsell.homebrew.description`: "Crie monstros, magias e itens customizados para suas sessões."

## Dev Notes

### Files to Create
- New: `components/billing/UpsellCard.tsx`
- Modify: `components/billing/ProBadge.tsx` — add onClick → UpsellCard

### i18n Keys (per feature)
- `upsell.homebrew.title/description`, `upsell.cr_calculator.title/description`, etc.

### Anti-Patterns
- **DON'T** show upsell randomly — always user-triggered
- **DON'T** show more than 1x per session per feature
- **DON'T** use localStorage (persists across sessions) — use sessionStorage

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.3]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, FR58]

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
- components/billing/UpsellCard.tsx
