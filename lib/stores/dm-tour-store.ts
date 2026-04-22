import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * DM tour store — Epic 04 Story 04-F (Player-as-DM onboarding).
 *
 * Zustand store for the post-role-flip tour that introduces the DM
 * dashboard. Mirrors the shape of `player-hq-tour-store` so both tours
 * can share the same TourOverlay + TourTooltip widgets and the
 * persistence layer behaves consistently.
 *
 * Why a separate store (not a shared "current tour" store)? Different
 * audiences (player on /app/player/[id], DM on /app/dashboard), different
 * persistence keys, different "has completed" semantics. Merging them
 * would mean a DM who already did the player-HQ tour would silently skip
 * the DM tour, or vice versa.
 *
 * Persistence key: `dm-tour-v1`. Completion flag also mirrored to
 * `user_onboarding.dm_tour_completed` by the provider so the tour
 * doesn't re-open on a fresh device (localStorage is per-device).
 */

interface DmTourState {
  currentStep: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface DmTourActions {
  startTour: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

type DmTourStore = DmTourState & DmTourActions;

const initialState: DmTourState = {
  currentStep: 0,
  isActive: false,
  isCompleted: false,
};

export const useDmTourStore = create<DmTourStore>()(
  persist(
    (set) => ({
      ...initialState,

      startTour: () => set({ isActive: true, currentStep: 0 }),

      goToStep: (step: number) => set({ currentStep: step }),

      skipTour: () =>
        set({ isActive: false, isCompleted: true, currentStep: 0 }),

      completeTour: () =>
        set({ isActive: false, isCompleted: true, currentStep: 0 }),

      resetTour: () => set(initialState),
    }),
    {
      name: "dm-tour-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
