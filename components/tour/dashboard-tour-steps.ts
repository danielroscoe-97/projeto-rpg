import type { TourStepConfig } from "./tour-steps";

/**
 * Dashboard-specific tour step extension — adds mobile selector support.
 * The DashboardTourProvider resolves `mobileSelector` at runtime.
 */
export interface DashboardTourStepConfig extends TourStepConfig {
  /** Selector to use on mobile (viewport < 1024px) — e.g. bottom nav vs sidebar */
  mobileSelector?: string;
  mobilePosition?: "top" | "bottom";
  /** Which roles see this step. "all" = everyone, "dm" = DM only, "player" = player first-campaign tour */
  audience: "all" | "dm" | "player";
}

export const DASHBOARD_TOUR_STEPS: DashboardTourStepConfig[] = [
  // Step 0 — Welcome (all users) — highlights the full dashboard content area
  {
    id: "dash-welcome",
    targetSelector: '[data-tour-id="dash-overview"]',
    titleKey: "dashboard_tour.welcome_title",
    descriptionKey: "dashboard_tour.welcome_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    audience: "all",
  },
  // Step 1 — Sidebar / bottom nav (DM only — players don't need nav tour)
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
    audience: "dm",
  },
  // Step 2 — Quick Actions (DM only)
  {
    id: "dash-quick-actions",
    targetSelector: '[data-tour-id="dash-quick-actions"]',
    titleKey: "dashboard_tour.quick_actions_title",
    descriptionKey: "dashboard_tour.quick_actions_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    audience: "dm",
  },
  // Step 3 — Campaigns (all users — players see "suas campanhas")
  {
    id: "dash-campaigns",
    targetSelector: '[data-tour-id="dash-campaigns"]',
    titleKey: "dashboard_tour.campaigns_title",
    descriptionKey: "dashboard_tour.campaigns_desc",
    type: "info",
    position: "top",
    phase: "setup",
    audience: "all",
  },
  // Step 4 — Combats nav item (DM only)
  {
    id: "dash-combats",
    targetSelector: '[data-tour-id="dash-nav-combats"]',
    mobileSelector: '[data-tour-id="dash-bottom-nav"]',
    titleKey: "dashboard_tour.combats_title",
    descriptionKey: "dashboard_tour.combats_desc",
    type: "info",
    position: "right",
    mobilePosition: "top",
    phase: "setup",
    audience: "dm",
  },
  // Step 5 — Soundboard nav item (DM only)
  {
    id: "dash-soundboard",
    targetSelector: '[data-tour-id="dash-nav-soundboard"]',
    mobileSelector: '[data-tour-id="dash-bottom-nav"]',
    titleKey: "dashboard_tour.soundboard_title",
    descriptionKey: "dashboard_tour.soundboard_desc",
    type: "info",
    position: "right",
    mobilePosition: "top",
    phase: "setup",
    audience: "dm",
  },
  // Step 6 — Complete / CTA (all users)
  {
    id: "dash-complete",
    targetSelector: '[data-tour-id="dash-new-session"]',
    titleKey: "dashboard_tour.complete_title",
    descriptionKey: "dashboard_tour.complete_desc",
    type: "info",
    position: "bottom",
    phase: "complete",
    modal: true,
    audience: "all",
  },

  // ── Player first-campaign tour (5 steps) ───────────────────────────────────
  // Step P1 — Welcome modal
  {
    id: "player-welcome",
    targetSelector: '[data-tour-id="dash-overview"]',
    titleKey: "dashboard_tour.player_welcome_title",
    descriptionKey: "dashboard_tour.player_welcome_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    modal: true,
    audience: "player",
  },
  // Step P2 — Pending invites (conditional — only shown if element exists in DOM)
  {
    id: "player-invites",
    targetSelector: '[data-tour-id="dash-pending-invites"]',
    titleKey: "dashboard_tour.player_invites_title",
    descriptionKey: "dashboard_tour.player_invites_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    audience: "player",
  },
  // Step P3 — Their campaign cards
  {
    id: "player-campaign",
    targetSelector: '[data-tour-id="dash-player-campaigns"]',
    titleKey: "dashboard_tour.player_campaign_title",
    descriptionKey: "dashboard_tour.player_campaign_desc",
    type: "info",
    position: "bottom",
    phase: "setup",
    audience: "player",
  },
  // Step P4 — Ready to join (modal)
  {
    id: "player-join",
    targetSelector: '[data-tour-id="dash-player-campaigns"]',
    titleKey: "dashboard_tour.player_join_title",
    descriptionKey: "dashboard_tour.player_join_desc",
    type: "info",
    position: "bottom",
    phase: "complete",
    modal: true,
    audience: "player",
  },
];
