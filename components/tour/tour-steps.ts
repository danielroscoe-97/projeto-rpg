export type TourStepType = "info" | "interactive";

export interface TourStepConfig {
  id: string;
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  type: TourStepType;
  position?: "top" | "bottom" | "left" | "right";
  /** For interactive steps: condition is checked externally by TourProvider */
  interactiveHint?: string;
}

export const TOUR_STEPS: TourStepConfig[] = [
  // Step 0 — Welcome (info)
  {
    id: "welcome",
    targetSelector: '[data-tour-id="welcome"]',
    titleKey: "tour.welcome_title",
    descriptionKey: "tour.welcome_description",
    type: "info",
    position: "bottom",
  },
  // Step 1 — Monster Search (interactive)
  {
    id: "monster-search",
    targetSelector: '[data-tour-id="monster-search"]',
    titleKey: "tour.search_title",
    descriptionKey: "tour.search_description",
    type: "interactive",
    position: "bottom",
    interactiveHint: "tour.search_hint",
  },
  // Step 2 — Add Monster (interactive)
  {
    id: "monster-result",
    targetSelector: '[data-tour-id="monster-result"]',
    titleKey: "tour.add_monster_title",
    descriptionKey: "tour.add_monster_description",
    type: "interactive",
    position: "bottom",
    interactiveHint: "tour.add_monster_hint",
  },
  // Step 3 — Manual Add Row (info)
  {
    id: "add-row",
    targetSelector: '[data-tour-id="add-row"]',
    titleKey: "tour.manual_add_title",
    descriptionKey: "tour.manual_add_description",
    type: "info",
    position: "top",
  },
  // Step 4 — Roll Initiative (interactive)
  {
    id: "roll-initiative",
    targetSelector: '[data-tour-id="roll-initiative"]',
    titleKey: "tour.initiative_title",
    descriptionKey: "tour.initiative_description",
    type: "interactive",
    position: "top",
    interactiveHint: "tour.initiative_hint",
  },
  // Step 5 — Start Combat (interactive)
  {
    id: "start-combat",
    targetSelector: '[data-tour-id="start-combat"]',
    titleKey: "tour.start_title",
    descriptionKey: "tour.start_description",
    type: "interactive",
    position: "top",
    interactiveHint: "tour.start_hint",
  },
  // Step 6 — Combat Controls (info)
  {
    id: "combat-controls",
    targetSelector: '[data-tour-id="combat-controls"]',
    titleKey: "tour.controls_title",
    descriptionKey: "tour.controls_description",
    type: "info",
    position: "bottom",
  },
  // Step 7 — Tour Complete (info)
  {
    id: "tour-complete",
    targetSelector: '[data-tour-id="tour-complete"]',
    titleKey: "tour.complete_title",
    descriptionKey: "tour.complete_description",
    type: "info",
    position: "bottom",
  },
];
