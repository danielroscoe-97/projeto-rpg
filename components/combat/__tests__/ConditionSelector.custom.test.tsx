/**
 * @jest-environment jsdom
 *
 * S4.2 — ConditionSelector custom-condition integration (flag + UI wiring).
 * Unit tests for the pure helpers live in lib/combat/custom-conditions.test.ts.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionSelector } from "../ConditionSelector";
import { setFeatureFlagOverrideForTests } from "@/lib/flags";

jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

// Mock pinned cards store (required by ConditionBadge mount chain).
jest.mock("@/lib/stores/pinned-cards-store", () => ({
  usePinnedCardsStore: (selector: (s: { pinCard: jest.Mock }) => unknown) =>
    selector({ pinCard: jest.fn() }),
}));

// Pick up the trackEvent mock so we can assert on it.
import { trackEvent } from "@/lib/analytics/track";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  setFeatureFlagOverrideForTests("ff_custom_conditions_v1", undefined);
});

describe("S4.2 — ConditionSelector custom tab (flag-gated)", () => {
  it("HIDES the custom section when ff_custom_conditions_v1 is OFF", () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", false);
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByTestId("custom-condition-section")).toBeNull();
    expect(screen.queryByTestId("custom-condition-name")).toBeNull();
  });

  it("SHOWS the custom section when ff_custom_conditions_v1 is ON", () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", true);
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("custom-condition-section")).toBeInTheDocument();
    expect(screen.getByTestId("custom-condition-name")).toBeInTheDocument();
    expect(screen.getByTestId("custom-condition-desc")).toBeInTheDocument();
  });

  it("emits `custom:Name|Desc` via onToggle when apply button is clicked", async () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", true);
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />
    );
    await user.type(screen.getByTestId("custom-condition-name"), "Bless");
    await user.type(screen.getByTestId("custom-condition-desc"), "Abençoado");
    await user.click(screen.getByTestId("custom-condition-apply"));
    expect(onToggle).toHaveBeenCalledWith("custom:Bless|Abençoado");
  });

  it("emits `custom:Name` (no pipe) when description is empty", async () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", true);
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />
    );
    await user.type(screen.getByTestId("custom-condition-name"), "Bless");
    await user.click(screen.getByTestId("custom-condition-apply"));
    expect(onToggle).toHaveBeenCalledWith("custom:Bless");
  });

  it("disables apply button when name is empty", () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", true);
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("custom-condition-apply")).toBeDisabled();
  });

  it("fires combat:custom_condition_applied with name_length (LGPD) — never the raw name", async () => {
    setFeatureFlagOverrideForTests("ff_custom_conditions_v1", true);
    const user = userEvent.setup();
    render(
      <ConditionSelector
        activeConditions={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />
    );
    await user.type(screen.getByTestId("custom-condition-name"), "Cego");
    await user.click(screen.getByTestId("custom-condition-apply"));
    expect(trackEvent).toHaveBeenCalledWith(
      "combat:custom_condition_applied",
      expect.objectContaining({ flag_on: true, name_length: 4 })
    );
    // Raw name MUST NOT be present.
    const properties = (trackEvent as jest.Mock).mock.calls[0][1];
    expect(JSON.stringify(properties).toLowerCase()).not.toContain("cego");
  });
});
