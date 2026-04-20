/**
 * @jest-environment jsdom
 *
 * S5.1 — PolymorphModal integration tests (flag + UI wiring + validation).
 * Pure logic for applyPolymorphDamage/Healing/createPolymorphState lives in
 * `lib/combat/polymorph.test.ts`.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PolymorphModal,
  shouldShowPolymorphTrigger,
} from "../PolymorphModal";
import { setFeatureFlagOverrideForTests } from "@/lib/flags";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  setFeatureFlagOverrideForTests("ff_polymorph_v1", undefined);
});

describe("S5.1 — PolymorphModal (flag-gated)", () => {
  it("returns null (renders nothing) when ff_polymorph_v1 is OFF", () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", false);
    render(
      <PolymorphModal
        open
        onOpenChange={jest.fn()}
        combatantName="Goblin"
        onApply={jest.fn()}
      />
    );
    expect(screen.queryByTestId("polymorph-modal")).toBeNull();
    expect(screen.queryByTestId("polymorph-form-name")).toBeNull();
  });

  it("renders dialog body when ff_polymorph_v1 is ON and open=true", () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    render(
      <PolymorphModal
        open
        onOpenChange={jest.fn()}
        combatantName="Goblin"
        onApply={jest.fn()}
      />
    );
    expect(screen.getByTestId("polymorph-modal")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-variant-polymorph")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-variant-wildshape")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-form-name")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-form-hp")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-form-ac")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-apply")).toBeInTheDocument();
    expect(screen.getByTestId("polymorph-cancel")).toBeInTheDocument();
  });

  it("disables Apply when name is empty and enables after typing valid name + hp", async () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    const user = userEvent.setup();
    render(
      <PolymorphModal
        open
        onOpenChange={jest.fn()}
        combatantName="Goblin"
        onApply={jest.fn()}
      />
    );
    // Apply starts disabled (no name, no hp).
    const applyBtn = screen.getByTestId("polymorph-apply");
    expect(applyBtn).toBeDisabled();

    // Only name: still disabled (hp still missing).
    await user.type(screen.getByTestId("polymorph-form-name"), "Brown Bear");
    expect(applyBtn).toBeDisabled();

    // With valid hp: enabled.
    await user.type(screen.getByTestId("polymorph-form-hp"), "34");
    expect(applyBtn).toBeEnabled();
  });

  it("dispatches onApply with wildshape variant + trimmed name + parsed hp/ac", async () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    const user = userEvent.setup();
    const onApply = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <PolymorphModal
        open
        onOpenChange={onOpenChange}
        combatantName="Druid"
        onApply={onApply}
      />
    );

    // Switch to wildshape.
    await user.click(screen.getByTestId("polymorph-variant-wildshape"));
    await user.type(
      screen.getByTestId("polymorph-form-name"),
      "  Dire Wolf  "
    );
    await user.type(screen.getByTestId("polymorph-form-hp"), "37");
    await user.type(screen.getByTestId("polymorph-form-ac"), "14");

    await user.click(screen.getByTestId("polymorph-apply"));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      variant: "wildshape",
      form_name: "Dire Wolf",
      form_max_hp: 37,
      form_ac: 14,
    });
    // Modal should close after successful apply.
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("passes undefined form_ac when AC field is empty (optional)", async () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(
      <PolymorphModal
        open
        onOpenChange={jest.fn()}
        combatantName="Druid"
        onApply={onApply}
      />
    );
    await user.type(screen.getByTestId("polymorph-form-name"), "T-Rex");
    await user.type(screen.getByTestId("polymorph-form-hp"), "136");
    await user.click(screen.getByTestId("polymorph-apply"));

    expect(onApply).toHaveBeenCalledWith({
      variant: "polymorph",
      form_name: "T-Rex",
      form_max_hp: 136,
      form_ac: undefined,
    });
  });

  it("rejects out-of-range form_max_hp (0 or > 999) — Apply stays disabled", async () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    const user = userEvent.setup();
    render(
      <PolymorphModal
        open
        onOpenChange={jest.fn()}
        combatantName="Goblin"
        onApply={jest.fn()}
      />
    );
    await user.type(screen.getByTestId("polymorph-form-name"), "Bear");
    // 0 is invalid
    await user.type(screen.getByTestId("polymorph-form-hp"), "0");
    expect(screen.getByTestId("polymorph-apply")).toBeDisabled();

    // clear + type too big (1000 > 999)
    await user.clear(screen.getByTestId("polymorph-form-hp"));
    await user.type(screen.getByTestId("polymorph-form-hp"), "1000");
    expect(screen.getByTestId("polymorph-apply")).toBeDisabled();

    // valid value enables
    await user.clear(screen.getByTestId("polymorph-form-hp"));
    await user.type(screen.getByTestId("polymorph-form-hp"), "20");
    expect(screen.getByTestId("polymorph-apply")).toBeEnabled();
  });

  it("Cancel closes the dialog without invoking onApply", async () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    const user = userEvent.setup();
    const onApply = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <PolymorphModal
        open
        onOpenChange={onOpenChange}
        combatantName="Goblin"
        onApply={onApply}
      />
    );
    await user.type(screen.getByTestId("polymorph-form-name"), "Bear");
    await user.type(screen.getByTestId("polymorph-form-hp"), "30");
    await user.click(screen.getByTestId("polymorph-cancel"));

    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shouldShowPolymorphTrigger reflects the ff_polymorph_v1 flag", () => {
    setFeatureFlagOverrideForTests("ff_polymorph_v1", false);
    expect(shouldShowPolymorphTrigger()).toBe(false);
    setFeatureFlagOverrideForTests("ff_polymorph_v1", true);
    expect(shouldShowPolymorphTrigger()).toBe(true);
  });
});
