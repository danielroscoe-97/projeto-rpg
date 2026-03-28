import { TOUR_STEPS } from "./tour-steps";
import type { TourStepConfig } from "./tour-steps";

describe("tour-steps", () => {
  it("has at least 5 steps", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(5);
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
    }
  });

  it("interactive steps have interactiveHint", () => {
    const interactiveSteps = TOUR_STEPS.filter((s) => s.type === "interactive");
    for (const step of interactiveSteps) {
      expect(step.interactiveHint).toBeTruthy();
    }
  });

  it("all targetSelectors use data-tour-id attribute", () => {
    for (const step of TOUR_STEPS) {
      expect(step.targetSelector).toMatch(/\[data-tour-id=/);
    }
  });

  it("first step is welcome (info)", () => {
    expect(TOUR_STEPS[0].id).toBe("welcome");
    expect(TOUR_STEPS[0].type).toBe("info");
  });

  it("last step is tour-complete (info)", () => {
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(last.id).toBe("tour-complete");
    expect(last.type).toBe("info");
  });

  it("step sequence follows expected combat flow", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    const searchIdx = ids.indexOf("monster-search");
    const addIdx = ids.indexOf("monster-result");
    const rollIdx = ids.indexOf("roll-initiative");
    const startIdx = ids.indexOf("start-combat");

    expect(searchIdx).toBeLessThan(addIdx);
    expect(addIdx).toBeLessThan(rollIdx);
    expect(rollIdx).toBeLessThan(startIdx);
  });

  it("titleKey and descriptionKey follow tour.* naming convention", () => {
    for (const step of TOUR_STEPS) {
      expect(step.titleKey).toMatch(/^tour\./);
      expect(step.descriptionKey).toMatch(/^tour\./);
    }
  });
});
