import type { TourStepConfig } from "./tour-steps";

/**
 * DM-onboarding tour — Epic 04 Story 04-F (Player-as-DM Upsell, Área 3).
 *
 * Runs on `/app/dashboard` immediately after a role flip (wizard's final
 * step redirects here). Four stations hit the highest-impact surfaces a
 * first-time DM needs to find: their campaigns, invite flow, combat
 * entry, and the secondary tools menu.
 *
 * Selectors intentionally match existing `data-tour-id` hooks already
 * present in the dashboard (players tour hits the player-HQ ones; DM
 * tour hits the dashboard ones). If a step's target is missing at run
 * time, the provider auto-skips to the next valid one — so edits to the
 * dashboard layout can't brick the tour.
 *
 * Copy lives in `messages/{en,pt-BR}.json` under `dmUpsell.tour_step*`.
 */
export const DM_TOUR_STEPS: TourStepConfig[] = [
  {
    id: "dm-dashboard",
    targetSelector: '[data-tour-id="dm-dashboard"]',
    titleKey: "dmUpsell.tour_step1_heading",
    descriptionKey: "dmUpsell.tour_step1_body",
    type: "info",
    position: "bottom",
    phase: "setup",
    modal: true,
  },
  {
    id: "dm-invite",
    targetSelector: '[data-tour-id="dm-invite"]',
    titleKey: "dmUpsell.tour_step2_heading",
    descriptionKey: "dmUpsell.tour_step2_body",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  {
    id: "dm-combat",
    targetSelector: '[data-tour-id="dm-combat"]',
    titleKey: "dmUpsell.tour_step3_heading",
    descriptionKey: "dmUpsell.tour_step3_body",
    type: "info",
    position: "bottom",
    phase: "combat",
  },
  {
    id: "dm-tools",
    targetSelector: '[data-tour-id="dm-tools"]',
    titleKey: "dmUpsell.tour_step4_heading",
    descriptionKey: "dmUpsell.tour_step4_body",
    type: "info",
    position: "bottom",
    phase: "complete",
    modal: true,
  },
];
