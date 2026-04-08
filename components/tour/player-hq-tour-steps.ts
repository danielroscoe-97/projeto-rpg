import type { TourStepConfig } from "./tour-steps";

export const PLAYER_HQ_TOUR_STEPS: TourStepConfig[] = [
  {
    id: "hq-welcome",
    targetSelector: '[data-tour-id="hq-header"]',
    titleKey: "player_hq_tour.welcome_title",
    descriptionKey: "player_hq_tour.welcome_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  {
    id: "hq-sheet",
    targetSelector: '[data-tour-id="hq-tab-sheet"]',
    titleKey: "player_hq_tour.sheet_title",
    descriptionKey: "player_hq_tour.sheet_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  {
    id: "hq-resources",
    targetSelector: '[data-tour-id="hq-tab-resources"]',
    titleKey: "player_hq_tour.resources_title",
    descriptionKey: "player_hq_tour.resources_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  {
    id: "hq-notes",
    targetSelector: '[data-tour-id="hq-tab-notes"]',
    titleKey: "player_hq_tour.notes_title",
    descriptionKey: "player_hq_tour.notes_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  {
    id: "hq-map",
    targetSelector: '[data-tour-id="hq-tab-map"]',
    titleKey: "player_hq_tour.map_title",
    descriptionKey: "player_hq_tour.map_desc",
    type: "info",
    position: "bottom",
    phase: "complete",
  },
];
