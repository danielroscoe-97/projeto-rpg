/**
 * Epic 04 Story 04-I — admin DM-upsell funnel surface tests.
 *
 * Covers (9):
 *  MetricsDashboard section (F7):
 *   1. Dashboard renders DM-upsell section when funnel rows are non-empty
 *   2. Section hides entirely when dm_upsell_funnel is []
 *   3. Each row shows the friendly label from DM_UPSELL_LABELS
 *   4. Unknown event names fall back to the raw event_name (graceful)
 *   5. Bar width uses unique_users / max(unique_users) normalisation
 *
 *  DmUpsellFunnelClient (F6 standalone route):
 *   6. Loading state while /api/admin/metrics fetch in flight
 *   7. Error state when API returns { error: ... }
 *   8. Empty state when dm_upsell_funnel is []
 *   9. Happy path renders rows with labels + counts
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// -----------------------------------------------------------------------
// Shared fetch mock (both components go through /api/admin/metrics).
// Adversarial-review fix: capture the original fetch in a module-level
// var and restore in afterEach so a pending-promise mock in one test
// doesn't leak into the next suite run.
// -----------------------------------------------------------------------

const realFetch = global.fetch;

const mockFetchResponse = (body: unknown) => {
  global.fetch = jest.fn(
    () => Promise.resolve({ json: () => Promise.resolve(body) }) as unknown as Promise<Response>,
  );
};

// -----------------------------------------------------------------------
// Imports (after fetch shim setup)
// -----------------------------------------------------------------------

import { MetricsDashboard } from "@/components/admin/MetricsDashboard";
import { DmUpsellFunnelClient } from "@/app/admin/dm-upsell-funnel/DmUpsellFunnelClient";

const FULL_METRICS_BODY = {
  data: {
    total_users: 100,
    registrations_last_7d: 10,
    registrations_last_30d: 30,
    day1_activation_pct: 50,
    week2_retention_pct: 20,
    avg_players_per_dm: 3,
    funnel: [],
    top_events: [],
    guest_funnel: [],
    combat_stats: null,
    dm_upsell_funnel: [
      {
        event_name: "dm_upsell:cta_shown",
        event_count: 100,
        unique_users: 80,
        funnel_order: 1,
      },
      {
        event_name: "dm_upsell:cta_clicked",
        event_count: 40,
        unique_users: 35,
        funnel_order: 2,
      },
      {
        event_name: "dm_upsell:some_new_event_2027",
        event_count: 5,
        unique_users: 5,
        funnel_order: 999,
      },
    ],
  },
};

describe("MetricsDashboard — DM upsell section (F7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore fetch so pending-promise mocks can't leak into the next test.
    global.fetch = realFetch;
  });

  it("renders the section when dm_upsell_funnel is non-empty", async () => {
    mockFetchResponse(FULL_METRICS_BODY);
    render(<MetricsDashboard />);
    await waitFor(() =>
      expect(screen.getByTestId("metrics.dm-upsell-funnel")).toBeInTheDocument(),
    );
  });

  it("hides the section entirely when dm_upsell_funnel is []", async () => {
    mockFetchResponse({
      data: { ...FULL_METRICS_BODY.data, dm_upsell_funnel: [] },
    });
    render(<MetricsDashboard />);
    // Wait for the dashboard to resolve (core metrics visible).
    await waitFor(() =>
      expect(screen.getByTestId("metrics-dashboard")).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("metrics.dm-upsell-funnel"),
    ).not.toBeInTheDocument();
  });

  it("shows friendly labels for known events", async () => {
    mockFetchResponse(FULL_METRICS_BODY);
    render(<MetricsDashboard />);
    await waitFor(() =>
      expect(screen.getByText("CTA Shown")).toBeInTheDocument(),
    );
    expect(screen.getByText("CTA Clicked")).toBeInTheDocument();
  });

  it("falls back to raw event_name for unknown events", async () => {
    mockFetchResponse(FULL_METRICS_BODY);
    render(<MetricsDashboard />);
    await waitFor(() =>
      expect(
        screen.getByText("dm_upsell:some_new_event_2027"),
      ).toBeInTheDocument(),
    );
  });

  it("normalises bar widths against max unique_users", async () => {
    mockFetchResponse(FULL_METRICS_BODY);
    render(<MetricsDashboard />);
    // Stable testids on the bar inner divs — adversarial-review fix,
    // replaces fragile `querySelector("div[style*='width']")` that
    // matched whichever child div happened to carry an inline style.
    const bar1 = await screen.findByTestId(
      "metrics.dm-upsell-row.dm_upsell:cta_shown.bar",
    );
    const bar2 = await screen.findByTestId(
      "metrics.dm-upsell-row.dm_upsell:cta_clicked.bar",
    );
    // cta_shown unique_users=80 (max), cta_clicked unique_users=35.
    expect((bar1 as HTMLElement).style.width).toBe("100%");
    // 35 / 80 = 43.75%
    expect((bar2 as HTMLElement).style.width).toBe("43.75%");
  });
});

describe("DmUpsellFunnelClient — standalone route (F6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore fetch so pending-promise mocks can't leak into the next test.
    global.fetch = realFetch;
  });

  it("shows loading state before fetch resolves", async () => {
    let _resolve: (v: unknown) => void = () => {};
    global.fetch = jest.fn(
      () =>
        new Promise((res) => {
          _resolve = res;
        }),
    ) as unknown as typeof fetch;
    render(<DmUpsellFunnelClient />);
    expect(
      screen.getByTestId("admin.dm-upsell-funnel.loading"),
    ).toBeInTheDocument();
  });

  it("shows error state when API returns an error payload", async () => {
    mockFetchResponse({ error: "forbidden" });
    render(<DmUpsellFunnelClient />);
    await waitFor(() =>
      expect(
        screen.getByTestId("admin.dm-upsell-funnel.error"),
      ).toBeInTheDocument(),
    );
  });

  it("shows empty state when no dm_upsell events are recorded", async () => {
    mockFetchResponse({ data: { dm_upsell_funnel: [] } });
    render(<DmUpsellFunnelClient />);
    await waitFor(() =>
      expect(
        screen.getByTestId("admin.dm-upsell-funnel.empty"),
      ).toBeInTheDocument(),
    );
  });

  it("renders rows with labels + counts on happy path", async () => {
    mockFetchResponse(FULL_METRICS_BODY);
    render(<DmUpsellFunnelClient />);
    await waitFor(() =>
      expect(
        screen.getByTestId("admin.dm-upsell-funnel.bars"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId(
        "admin.dm-upsell-funnel.row.dm_upsell:cta_shown",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("CTA Shown")).toBeInTheDocument();
  });
});
