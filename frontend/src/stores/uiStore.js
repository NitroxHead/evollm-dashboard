import { create } from 'zustand';

const loadJson = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const useUiStore = create((set, get) => ({
  sidebarOpen: true,
  autoRefreshFast: loadJson('evollm_auto_refresh_fast', false),
  bookmarks: loadJson('evollm_bookmarks', []),
  annotations: loadJson('evollm_annotations', {}),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleAutoRefresh: () =>
    set((s) => {
      const next = !s.autoRefreshFast;
      localStorage.setItem('evollm_auto_refresh_fast', JSON.stringify(next));
      return { autoRefreshFast: next };
    }),

  addBookmark: (item) =>
    set((s) => {
      const bookmarks = [...s.bookmarks, item];
      localStorage.setItem('evollm_bookmarks', JSON.stringify(bookmarks));
      return { bookmarks };
    }),

  removeBookmark: (id) =>
    set((s) => {
      const bookmarks = s.bookmarks.filter((b) => b.id !== id);
      localStorage.setItem('evollm_bookmarks', JSON.stringify(bookmarks));
      return { bookmarks };
    }),

  setAnnotation: (programId, note) =>
    set((s) => {
      const annotations = { ...s.annotations, [programId]: note };
      localStorage.setItem('evollm_annotations', JSON.stringify(annotations));
      return { annotations };
    }),
}));
