# Story 11.1: Clean Initial State

**Epic**: 11 — Monster Search & Combat Setup Overhaul
**Priority**: P0
**Estimate**: 1 SP
**Status**: in-progress

## Description

Remove all pre-filled combatants (Goblin 1/2/3, Herói 1/2) that appear when the encounter setup screen loads in both guest (`/try`) and authenticated (`/app/session/new`) flows. Replace the empty list with helpful onboarding copy.

## Files to Change

- `lib/stores/guest-combat-store.ts` — remove sample encounter initialisation
- `components/combat/EncounterSetup.tsx` — remove any default combatant rows; add empty state UI
- `app/try/layout.tsx` — remove any sample data injection

## Acceptance Criteria

- [ ] Guest store initialises with zero combatants — no sample encounter on first render
- [ ] Auth encounter setup initialises with zero combatants — no default rows
- [ ] Empty state shown when list is empty: _"Nenhum combatente ainda — pesquise um monstro acima ou adicione manualmente."_
- [ ] "Limpar tudo" button hidden/disabled when list is empty
- [ ] `next build` passes with zero TypeScript errors

## Dev Notes

- `guest-combat-store.ts` has a `loadSampleEncounter()` call or inline initial state — locate and remove
- `EncounterSetup.tsx` may have hard-coded default rows in `useState` initialisation — set to `[]`
- Check `app/try/layout.tsx` for any `useEffect` that seeds the guest store with sample data
