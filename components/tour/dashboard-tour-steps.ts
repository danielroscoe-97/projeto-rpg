import type { TourStepConfig } from "./tour-steps";

/**
 * Dashboard-specific tour step extension — adds mobile selector support.
 * The DashboardTourProvider resolves `mobileSelector` at runtime.
 */
export interface DashboardTourStepConfig extends TourStepConfig {
  /** Selector to use on mobile (viewport < 1024px) — e.g. bottom nav vs sidebar */
  mobileSelector?: string;
  mobilePosition?: "top" | "bottom";
}

export const DASHBOARD_TOUR_STEPS: DashboardTourStepConfig[] = [
  // Step 0 — Welcome modal
  {
    id: "dash-welcome",
    targetSelector: '[data-tour-id="dash-overview"]',
    titleKey: "dashboard_tour.welcome_title",
    descriptionKey: "dashboard_tour.welcome_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    modal: true,
  },
  // Step 1 — Sidebar / bottom nav
  {
    id: "dash-sidebar",
    targetSelector: '[data-tour-id="dash-sidebar"]',
    mobileSelector: '[data-tour-id="dash-bottom-nav"]',
    titleKey: "dashboard_tour.sidebar_title",
    descriptionKey: "dashboard_tour.sidebar_desc",
    type: "info",
    position: "right",
    mobilePosition: "top",
    phase: "setup",
  },
  // Step 2 — Quick Actions
  {
    id: "dash-quick-actions",
    targetSelector: '[data-tour-id="dash-quick-actions"]',
    titleKey: "dashboard_tour.quick_actions_title",
    descriptionKey: "dashboard_tour.quick_actions_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  // Step 3 — DM Campaigns
  {
    id: "dash-campaigns",
    targetSelector: '[data-tour-id="dash-campaigns"]',
    titleKey: "dashboard_tour.campaigns_title",
    descriptionKey: "dashboard_tour.campaigns_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
  },
  // Step 4 — Combats nav item
  {
    id: "dash-combats",
    targetSelector: '[data-tour-id="dash-nav-combats"]',
    titleKey: "dashboard_tour.combats_title",
    descriptionKey: "dashboard_tour.combats_desc",
    type: "info",
    position: "right",
    mobilePosition: "top",
    phase: "setup",
  },
  // Step 5 — Soundboard nav item
  {
    id: "dash-soundboard",
    targetSelector: '[data-tour-id="dash-nav-soundboard"]',
    titleKey: "dashboard_tour.soundboard_title",
    descriptionKey: "dashboard_tour.soundboard_desc",
    type: "info",
    position: "right",
    mobilePosition: "top",
    phase: "setup",
  },
  // Step 6 — Complete / CTA (modal)
  {
    id: "dash-complete",
    targetSelector: '[data-tour-id="dash-new-session"]',
    titleKey: "dashboard_tour.complete_title",
    descriptionKey: "dashboard_tour.complete_desc",
    type: "info",
    position: "bottom",
    phase: "complete",
    modal: true,
  },
];
