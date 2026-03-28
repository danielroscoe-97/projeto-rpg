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
  /** Phase this step belongs to — used for progress display */
  phase: "setup" | "combat" | "complete";
  /** Render as centered modal instead of anchored tooltip */
  modal?: boolean;
  /** Hide this step on mobile (< 768px) */
  hideOnMobile?: boolean;
  /** On mobile, merge this step's content into the next info step */
  mergeOnMobile?: boolean;
}

export const TOUR_STEPS: TourStepConfig[] = [
  // === SETUP PHASE ===

  // Step 0 — Welcome (centered modal, no anchor)
  {
    id: "welcome",
    targetSelector: '[data-tour-id="welcome"]',
    titleKey: "tour.welcome_title",
    descriptionKey: "tour.welcome_description",
    type: "info",
    position: "bottom",
    phase: "setup",
    modal: true,
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
    phase: "setup",
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
    phase: "setup",
  },
  // Step 3 — Manual Add Row (info)
  {
    id: "add-row",
    targetSelector: '[data-tour-id="add-row"]',
    titleKey: "tour.manual_add_title",
    descriptionKey: "tour.manual_add_description",
    type: "info",
    position: "top",
    phase: "setup",
  },
  // Step 4 — Roll Initiative (info — always shown, never auto-skipped)
  {
    id: "roll-initiative",
    targetSelector: '[data-tour-id="roll-initiative"]',
    titleKey: "tour.initiative_title",
    descriptionKey: "tour.initiative_description",
    type: "info",
    position: "top",
    phase: "setup",
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
    phase: "setup",
  },

  // === COMBAT PHASE ===

  // Step 6 — Combat Controls Overview
  {
    id: "combat-controls",
    targetSelector: '[data-tour-id="combat-controls"]',
    titleKey: "tour.controls_title",
    descriptionKey: "tour.controls_description",
    type: "info",
    position: "bottom",
    phase: "combat",
  },
  // Step 7 — HP + Name click (merges into next step on mobile)
  {
    id: "hp-adjust",
    targetSelector: '[data-tour-id="hp-adjust"]',
    titleKey: "tour.hp_adjust_title",
    descriptionKey: "tour.hp_adjust_description",
    type: "info",
    position: "left",
    phase: "combat",
    mergeOnMobile: true,
  },
  // Step 8 — Next Turn
  {
    id: "next-turn",
    targetSelector: '[data-tour-id="next-turn"]',
    titleKey: "tour.next_turn_title",
    descriptionKey: "tour.next_turn_description",
    type: "info",
    position: "bottom",
    phase: "combat",
  },
  // Step 9 — Keyboard Shortcuts tip (desktop only)
  {
    id: "keyboard-tip",
    targetSelector: '[data-tour-id="tour-complete"]',
    titleKey: "tour.keyboard_title",
    descriptionKey: "tour.keyboard_description",
    type: "info",
    position: "bottom",
    phase: "combat",
    hideOnMobile: true,
  },

  // === COMPLETE PHASE ===

  // Step 10 — Tour Complete with CTA
  {
    id: "tour-complete",
    targetSelector: '[data-tour-id="tour-complete"]',
    titleKey: "tour.complete_title",
    descriptionKey: "tour.complete_description",
    type: "info",
    position: "bottom",
    phase: "complete",
    modal: true,
  },
];
