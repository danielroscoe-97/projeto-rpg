import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DashboardTourState {
  currentStep: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface DashboardTourActions {
  startTour: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

type DashboardTourStore = DashboardTourState & DashboardTourActions;

const initialState: DashboardTourState = {
  currentStep: 0,
  isActive: false,
  isCompleted: false,
};

export const useDashboardTourStore = create<DashboardTourStore>()(
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
      name: "dashboard-tour-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
