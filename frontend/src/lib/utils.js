/** Formatting and utility helpers. */

export function fmt(v, decimals = 4) {
  if (v == null) return '\u2014';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(decimals);
}

export function timeAgo(ts) {
  if (!ts) return '\u2014';
  const secs = Math.floor(Date.now() / 1000 - ts);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function formatTimestamp(ts) {
  if (!ts) return '\u2014';
  return new Date(ts * 1000).toLocaleString();
}

export function formatDuration(secs) {
  if (!secs || secs <= 0) return '\u2014';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function truncate(s, n = 60) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

export function shortId(id) {
  if (!id) return '\u2014';
  return id.length > 12 ? id.slice(0, 8) + '...' : id;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
