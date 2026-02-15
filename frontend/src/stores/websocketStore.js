import { create } from 'zustand';

export const useWebSocketStore = create((set, get) => ({
  connected: false,
  events: [],
  unreadCounts: {}, // experiment_id -> count

  setConnected: (v) => set({ connected: v }),

  addEvent: (event) =>
    set((state) => {
      const events = [event, ...state.events].slice(0, 500);
      const unreadCounts = { ...state.unreadCounts };
      const eid = event.experiment_id;
      unreadCounts[eid] = (unreadCounts[eid] || 0) + 1;
      return { events, unreadCounts };
    }),

  clearUnread: (experimentId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [experimentId]: 0 },
    })),

  clearEvents: () => set({ events: [], unreadCounts: {} }),
}));
