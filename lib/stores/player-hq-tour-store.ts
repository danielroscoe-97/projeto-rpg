import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PlayerHqTourState {
  currentStep: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface PlayerHqTourActions {
  startTour: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

type PlayerHqTourStore = PlayerHqTourState & PlayerHqTourActions;

const initialState: PlayerHqTourState = {
  currentStep: 0,
  isActive: false,
  isCompleted: false,
};

export const usePlayerHqTourStore = create<PlayerHqTourStore>()(
  persist(
    (set) => ({
      ...initialState,

      startTour: () =>
        set({ isActive: true, currentStep: 0 }),

      goToStep: (step: number) =>
        set({ currentStep: step }),

      skipTour: () =>
        set({ isActive: false, isCompleted: true, currentStep: 0 }),

      completeTour: () =>
        set({ isActive: false, isCompleted: true, currentStep: 0 }),

      resetTour: () => set(initialState),
    }),
    {
      name: "player-hq-tour-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
