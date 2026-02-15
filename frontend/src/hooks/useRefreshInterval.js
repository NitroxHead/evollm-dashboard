import { useUiStore } from '../stores/uiStore';

/**
 * Returns a refetch interval — 3000ms when fast mode is on, otherwise normalMs.
 */
export function useRefreshInterval(normalMs) {
  const fast = useUiStore((s) => s.autoRefreshFast);
  return fast ? 3000 : normalMs;
}
