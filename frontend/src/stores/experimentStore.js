import { create } from 'zustand';

export const useExperimentStore = create((set) => ({
  experiments: [],
  activeExperimentId: null,

  setExperiments: (experiments) => set({ experiments }),

  setActiveExperiment: (id) => set({ activeExperimentId: id }),

  getActiveExperiment: () => {
    const state = useExperimentStore.getState();
    return state.experiments.find((e) => e.id === state.activeExperimentId) || null;
  },
}));
