import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TourState {
  currentStep: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface TourActions {
  startTour: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

type TourStore = TourState & TourActions;

const initialState: TourState = {
  currentStep: 0,
  isActive: false,
  isCompleted: false,
};

export const useTourStore = create<TourStore>()(
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
      name: "guided-tour-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
