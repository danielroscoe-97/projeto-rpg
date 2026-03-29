import { useTourStore } from "./tour-store";

// Reset store between tests
beforeEach(() => {
  useTourStore.getState().resetTour();
});

describe("tour-store", () => {
  it("starts with initial state", () => {
    const state = useTourStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStep).toBe(0);
  });

  it("startTour activates and resets to step 0", () => {
    useTourStore.getState().goToStep(3);
    useTourStore.getState().startTour();

    const state = useTourStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.currentStep).toBe(0);
  });

  it("goToStep sets arbitrary step", () => {
    useTourStore.getState().startTour();
    useTourStore.getState().goToStep(5);

    expect(useTourStore.getState().currentStep).toBe(5);
  });

  it("skipTour marks as completed and deactivates", () => {
    useTourStore.getState().startTour();
    useTourStore.getState().goToStep(3);
    useTourStore.getState().skipTour();

    const state = useTourStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(true);
    expect(state.currentStep).toBe(0);
  });

  it("completeTour marks as completed and deactivates", () => {
    useTourStore.getState().startTour();
    useTourStore.getState().goToStep(7);
    useTourStore.getState().completeTour();

    const state = useTourStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(true);
    expect(state.currentStep).toBe(0);
  });

  it("resetTour restores initial state", () => {
    useTourStore.getState().startTour();
    useTourStore.getState().goToStep(5);
    useTourStore.getState().completeTour();
    useTourStore.getState().resetTour();

    const state = useTourStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStep).toBe(0);
  });
});
