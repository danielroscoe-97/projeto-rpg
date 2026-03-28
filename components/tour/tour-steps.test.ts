import { TOUR_STEPS } from "./tour-steps";

describe("tour-steps", () => {
  it("has at least 8 steps", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(8);
  });

  it("all steps have unique ids", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all steps have required fields", () => {
    for (const step of TOUR_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.targetSelector).toBeTruthy();
      expect(step.titleKey).toBeTruthy();
      expect(step.descriptionKey).toBeTruthy();
      expect(["info", "interactive"]).toContain(step.type);
      expect(["setup", "combat", "complete"]).toContain(step.phase);
    }
  });

  it("interactive steps have interactiveHint", () => {
    const interactiveSteps = TOUR_STEPS.filter((s) => s.type === "interactive");
    expect(interactiveSteps.length).toBeGreaterThan(0);
    for (const step of interactiveSteps) {
      expect(step.interactiveHint).toBeTruthy();
    }
  });

  it("welcome and complete steps are modals", () => {
    expect(TOUR_STEPS[0].modal).toBe(true);
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].modal).toBe(true);
  });

  it("keyboard-tip is hidden on mobile", () => {
    const keyboardStep = TOUR_STEPS.find((s) => s.id === "keyboard-tip");
    expect(keyboardStep?.hideOnMobile).toBe(true);
  });

  it("all targetSelectors use data-tour-id attribute", () => {
    for (const step of TOUR_STEPS) {
      expect(step.targetSelector).toMatch(/\[data-tour-id=/);
    }
  });

  it("first step is welcome (info, setup phase)", () => {
    expect(TOUR_STEPS[0].id).toBe("welcome");
    expect(TOUR_STEPS[0].type).toBe("info");
    expect(TOUR_STEPS[0].phase).toBe("setup");
  });

  it("last step is tour-complete (info, complete phase)", () => {
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(last.id).toBe("tour-complete");
    expect(last.type).toBe("info");
    expect(last.phase).toBe("complete");
  });

  it("step sequence follows expected combat flow", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    const searchIdx = ids.indexOf("monster-search");
    const addIdx = ids.indexOf("monster-result");
    const rollIdx = ids.indexOf("roll-initiative");
    const startIdx = ids.indexOf("start-combat");
    const controlsIdx = ids.indexOf("combat-controls");

    expect(searchIdx).toBeLessThan(addIdx);
    expect(addIdx).toBeLessThan(rollIdx);
    expect(rollIdx).toBeLessThan(startIdx);
    expect(startIdx).toBeLessThan(controlsIdx);
  });

  it("titleKey and descriptionKey follow tour.* naming convention", () => {
    for (const step of TOUR_STEPS) {
      expect(step.titleKey).toMatch(/^tour\./);
      expect(step.descriptionKey).toMatch(/^tour\./);
    }
  });

  it("phases appear in correct order: setup → combat → complete", () => {
    const phases = TOUR_STEPS.map((s) => s.phase);
    let lastPhaseIdx = -1;
    const phaseOrder = ["setup", "combat", "complete"];

    for (const phase of phases) {
      const idx = phaseOrder.indexOf(phase);
      expect(idx).toBeGreaterThanOrEqual(lastPhaseIdx);
      lastPhaseIdx = idx;
    }
  });

  it("has steps for HP adjustment and next turn in combat phase", () => {
    const combatSteps = TOUR_STEPS.filter((s) => s.phase === "combat");
    const ids = combatSteps.map((s) => s.id);
    expect(ids).toContain("hp-adjust");
    expect(ids).toContain("next-turn");
  });

  it("has keyboard shortcut tip", () => {
    const keyboardStep = TOUR_STEPS.find((s) => s.id === "keyboard-tip");
    expect(keyboardStep).toBeDefined();
    expect(keyboardStep!.phase).toBe("combat");
  });
});
