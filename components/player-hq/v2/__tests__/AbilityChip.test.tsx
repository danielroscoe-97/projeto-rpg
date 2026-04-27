/**
 * @jest-environment jsdom
 *
 * AbilityChip unit tests — Wave 3b · Story C7.
 *
 * Validates the chip's user-facing contract:
 *   1. Static render correctness (label / mod / score for filled vs unfilled).
 *   2. Clickable=false hides the action zone (legacy parity for guest/anon).
 *   3. CHECK button click triggers `useAbilityRoll.rollCheck` with the right args.
 *   4. SAVE button click triggers `useAbilityRoll.rollSave` and respects `proficient`.
 *   5. Long-press opens the advantage/disadvantage menu; menu pick triggers a
 *      mode-tagged roll.
 *   6. Aria labels include "with proficiency" only on proficient saves.
 *   7. Touch target meets WCAG SC 2.5.5 (≥44px tall).
 *
 * The toast helper + dice-roller are mocked so each test focuses on the
 * chip's own wiring without tripping into network / sonner internals.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AbilityChip } from "../AbilityChip";

// ── Mock the roll surface ─────────────────────────────────────────────
const mockRollCheck = jest.fn();
const mockRollSave = jest.fn();
const mockGetHistory = jest.fn().mockReturnValue([]);

jest.mock("@/lib/hooks/useAbilityRoll", () => ({
  useAbilityRoll: () => ({
    rollCheck: mockRollCheck,
    rollSave: mockRollSave,
    getHistory: mockGetHistory,
  }),
}));

// Mock the toast helper — we only assert it was invoked with the result
// returned from the hook; the toast's own rendering is covered elsewhere.
const mockShowToast = jest.fn();
jest.mock("@/components/player-hq/v2/RollResultToast", () => ({
  showRollResultToast: (result: unknown, labels: unknown) => mockShowToast(result, labels),
  DEFAULT_ROLL_TOAST_LABELS: { checkLabel: "check", saveLabel: "save", advantageLabel: "with advantage", disadvantageLabel: "with disadvantage" },
}));

const ROLL_CONTEXT = {
  campaignId: "camp-1",
  characterId: "char-1",
  characterName: "Test",
  profBonus: 3,
};

const FAKE_RESULT = {
  ability: "str" as const,
  rollType: "check" as const,
  total: 15,
  modifier: 2,
  proficient: false,
  mode: "normal" as const,
  formula: "1d20 + 2",
  rolls: [13],
  keptIndex: 0,
  timestamp: 1700000000000,
};

beforeEach(() => {
  mockRollCheck.mockReset().mockReturnValue(FAKE_RESULT);
  mockRollSave.mockReset().mockReturnValue({ ...FAKE_RESULT, rollType: "save", proficient: true });
  mockShowToast.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AbilityChip — static render", () => {
  it("displays label, modifier, and score when score is filled", () => {
    render(
      <AbilityChip
        ability="str"
        label="STR"
        score={14}
        proficient={false}
        clickable={false}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const chip = screen.getByTestId("ability-chip-str");
    expect(chip).toHaveTextContent("STR");
    expect(chip).toHaveTextContent("+2");
    expect(chip).toHaveTextContent("14");
  });

  it("renders em-dash for unfilled score", () => {
    render(
      <AbilityChip
        ability="dex"
        label="DEX"
        score={null}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const chip = screen.getByTestId("ability-chip-dex");
    expect(chip).toHaveTextContent("—");
    // Action zone must NOT render when there's no modifier to roll
    expect(screen.queryByTestId("ability-chip-dex-check")).toBeNull();
    expect(screen.queryByTestId("ability-chip-dex-save")).toBeNull();
  });

  it("formats negative modifier with minus sign", () => {
    render(
      <AbilityChip
        ability="int"
        label="INT"
        score={8}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    expect(screen.getByTestId("ability-chip-int")).toHaveTextContent("-1");
  });
});

describe("AbilityChip — clickable=false (legacy parity)", () => {
  it("does NOT render CHECK or SAVE buttons", () => {
    render(
      <AbilityChip
        ability="str"
        label="STR"
        score={14}
        proficient={true}
        clickable={false}
        rollContext={ROLL_CONTEXT}
      />,
    );
    expect(screen.queryByTestId("ability-chip-str-check")).toBeNull();
    expect(screen.queryByTestId("ability-chip-str-save")).toBeNull();
  });
});

describe("AbilityChip — CHECK roll", () => {
  it("triggers rollCheck with the right args on tap", () => {
    render(
      <AbilityChip
        ability="con"
        label="CON"
        score={16}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-con-check");
    fireEvent.mouseDown(checkBtn, { button: 0 });
    fireEvent.mouseUp(checkBtn);
    expect(mockRollCheck).toHaveBeenCalledTimes(1);
    expect(mockRollCheck).toHaveBeenCalledWith({
      ability: "con",
      abilityMod: 3,
      mode: "normal",
    });
    expect(mockShowToast).toHaveBeenCalledWith(FAKE_RESULT, expect.any(Object));
  });

  it("passes Shift modifier as advantage", () => {
    render(
      <AbilityChip
        ability="con"
        label="CON"
        score={16}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-con-check");
    fireEvent.mouseDown(checkBtn, { button: 0, shiftKey: true });
    fireEvent.mouseUp(checkBtn, { shiftKey: true });
    expect(mockRollCheck).toHaveBeenCalledWith(expect.objectContaining({ mode: "advantage" }));
  });

  it("ignores right-click (button !== 0)", () => {
    render(
      <AbilityChip
        ability="con"
        label="CON"
        score={16}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-con-check");
    fireEvent.mouseDown(checkBtn, { button: 2 });
    fireEvent.mouseUp(checkBtn);
    expect(mockRollCheck).not.toHaveBeenCalled();
  });
});

describe("AbilityChip — SAVE roll + proficiency", () => {
  it("triggers rollSave with proficient=true", () => {
    render(
      <AbilityChip
        ability="con"
        label="CON"
        score={16}
        proficient={true}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const saveBtn = screen.getByTestId("ability-chip-con-save");
    fireEvent.mouseDown(saveBtn, { button: 0 });
    fireEvent.mouseUp(saveBtn);
    expect(mockRollSave).toHaveBeenCalledTimes(1);
    expect(mockRollSave).toHaveBeenCalledWith({
      ability: "con",
      abilityMod: 3,
      proficient: true,
      mode: "normal",
    });
  });

  it("shows the proficiency dot when proficient=true", () => {
    render(
      <AbilityChip
        ability="con"
        label="CON"
        score={16}
        proficient={true}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    expect(screen.queryByTestId("ability-chip-con-prof-dot")).not.toBeNull();
  });

  it("hides the proficiency dot when proficient=false", () => {
    render(
      <AbilityChip
        ability="str"
        label="STR"
        score={10}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    expect(screen.queryByTestId("ability-chip-str-prof-dot")).toBeNull();
  });

  it("aria-label mentions proficiency only when proficient", () => {
    const { rerender } = render(
      <AbilityChip
        ability="cha"
        label="CHA"
        score={14}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    let saveBtn = screen.getByTestId("ability-chip-cha-save");
    expect(saveBtn.getAttribute("aria-label")).not.toContain("proficiency");

    rerender(
      <AbilityChip
        ability="cha"
        label="CHA"
        score={14}
        proficient={true}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    saveBtn = screen.getByTestId("ability-chip-cha-save");
    expect(saveBtn.getAttribute("aria-label")).toContain("proficiency");
  });
});

describe("AbilityChip — long-press menu", () => {
  it("opens the menu after LONG_PRESS_MS continuous press", async () => {
    render(
      <AbilityChip
        ability="wis"
        label="WIS"
        score={12}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-wis-check");
    await act(async () => {
      fireEvent.mouseDown(checkBtn, { button: 0 });
    });
    // Advance fake timers past the long-press threshold. React 19 + jest
    // fake timers + state-update-in-setTimeout requires async act so the
    // scheduled microtask flush happens before assertion.
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId("ability-chip-roll-mode-menu")).not.toBeNull();
    // The pointer-up should NOT trigger an immediate roll because the
    // long-press already fired.
    await act(async () => {
      fireEvent.mouseUp(checkBtn);
    });
    expect(mockRollCheck).not.toHaveBeenCalled();
  });

  it("clicking 'Advantage' triggers a check roll with mode=advantage", async () => {
    render(
      <AbilityChip
        ability="wis"
        label="WIS"
        score={12}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-wis-check");
    await act(async () => {
      fireEvent.mouseDown(checkBtn, { button: 0 });
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      fireEvent.mouseUp(checkBtn);
    });
    const advBtn = screen.getByTestId("ability-chip-mode-advantage");
    await act(async () => {
      fireEvent.click(advBtn);
    });
    expect(mockRollCheck).toHaveBeenCalledWith({
      ability: "wis",
      abilityMod: 1,
      mode: "advantage",
    });
  });

  it("releases before threshold = tap (not long-press)", async () => {
    render(
      <AbilityChip
        ability="dex"
        label="DEX"
        score={14}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-dex-check");
    await act(async () => {
      fireEvent.mouseDown(checkBtn, { button: 0 });
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await act(async () => {
      fireEvent.mouseUp(checkBtn);
    });
    expect(screen.queryByTestId("ability-chip-roll-mode-menu")).toBeNull();
    expect(mockRollCheck).toHaveBeenCalledTimes(1);
    expect(mockRollCheck).toHaveBeenCalledWith({
      ability: "dex",
      abilityMod: 2,
      mode: "normal",
    });
  });
});

describe("AbilityChip — manual modifier menu (issue #88 spec gap)", () => {
  it("opens the manual-modifier input view when the menu option is clicked", async () => {
    render(
      <AbilityChip
        ability="wis"
        label="WIS"
        score={12}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-wis-check");
    await act(async () => {
      fireEvent.mouseDown(checkBtn, { button: 0 });
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      fireEvent.mouseUp(checkBtn);
    });
    const manualBtn = screen.getByTestId("ability-chip-mode-manual-modifier");
    await act(async () => {
      fireEvent.click(manualBtn);
    });
    expect(screen.queryByTestId("ability-chip-manual-modifier-form")).not.toBeNull();
    expect(screen.queryByTestId("ability-chip-manual-modifier-input")).not.toBeNull();
  });

  it("Apply button rolls a normal-mode check with mod + manual extra summed", async () => {
    render(
      <AbilityChip
        ability="wis"
        label="WIS"
        score={12}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    // WIS 12 → mod = +1. Manual modifier +3 (Bless avg) → roll uses +4.
    const checkBtn = screen.getByTestId("ability-chip-wis-check");
    await act(async () => {
      fireEvent.mouseDown(checkBtn, { button: 0 });
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      fireEvent.mouseUp(checkBtn);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("ability-chip-mode-manual-modifier"));
    });
    const input = screen.getByTestId(
      "ability-chip-manual-modifier-input",
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "3" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("ability-chip-manual-modifier-apply"));
    });
    expect(mockRollCheck).toHaveBeenCalledWith({
      ability: "wis",
      abilityMod: 4,
      mode: "normal",
    });
  });
});

describe("AbilityChip — accessibility", () => {
  it("CHECK button has min-h-[44px] for WCAG SC 2.5.5 (touch target)", () => {
    render(
      <AbilityChip
        ability="str"
        label="STR"
        score={10}
        proficient={false}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const checkBtn = screen.getByTestId("ability-chip-str-check");
    expect(checkBtn.className).toContain("min-h-[44px]");
  });

  it("SAVE button has min-h-[44px]", () => {
    render(
      <AbilityChip
        ability="str"
        label="STR"
        score={10}
        proficient={true}
        clickable={true}
        rollContext={ROLL_CONTEXT}
      />,
    );
    const saveBtn = screen.getByTestId("ability-chip-str-save");
    expect(saveBtn.className).toContain("min-h-[44px]");
  });
});
