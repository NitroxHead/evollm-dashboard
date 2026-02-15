/** Color utilities for the dashboard. */

/** Map a score [0..1] to a red->yellow->green gradient. */
export function scoreToColor(score, min = 0, max = 1) {
  if (max === min) return '#22c55e';
  const t = Math.max(0, Math.min(1, (score - min) / (max - min)));
  if (t < 0.5) {
    const r = 239;
    const g = Math.round(68 + (179 - 68) * (t * 2));
    const b = 68;
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(239 - (239 - 34) * ((t - 0.5) * 2));
  const g = Math.round(179 + (197 - 179) * ((t - 0.5) * 2));
  const b = Math.round(68 - (68 - 94) * ((t - 0.5) * 2));
  return `rgb(${r},${g},${b})`;
}

/** Island color palette (8 distinct colors). */
export const ISLAND_COLORS = [
  '#6366f1', '#22c55e', '#f97316', '#3b82f6',
  '#ef4444', '#eab308', '#a855f7', '#14b8a6',
];

export function islandColor(idx) {
  return ISLAND_COLORS[idx % ISLAND_COLORS.length];
}

export const CHART_COLORS = {
  best: '#6366f1',
  mean: '#3b82f6',
  median: '#14b8a6',
  correct: '#22c55e',
  incorrect: '#ef4444',
};
