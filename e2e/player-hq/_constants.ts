/**
 * Player HQ — Shared E2E constants (EP-INFRA.4, Sprint 1 Track B).
 *
 * Filename starts with `_` so Playwright's default test matcher
 * (`**\/*.spec.ts` / `**\/*.test.ts`) does NOT pick it up as a spec.
 *
 * Keep this file tiny on purpose: spec-scoped constants only. Broader
 * helpers belong in `e2e/helpers/`.
 */

/**
 * V1 tab keys rendered by `components/player-hq/PlayerHqShell.tsx`.
 *
 * Order matches the visual order in the shell's tablist; if Sprint 2
 * introduces the 4-tab V2 shell (Herói / Arsenal / Diário / Mapa) behind
 * `NEXT_PUBLIC_PLAYER_HQ_V2`, add a sibling `TAB_KEYS_V2` — do NOT mutate
 * this list (baseline specs depend on the exact V1 ordering).
 */
export const TAB_KEYS = [
  "map",
  "sheet",
  "resources",
  "abilities",
  "inventory",
  "notes",
  "quests",
] as const;

export type PlayerHqTabKey = (typeof TAB_KEYS)[number];
