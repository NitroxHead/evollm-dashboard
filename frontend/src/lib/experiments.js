/** Shared experiment sorting, grouping, and campaign extraction utilities. */

/** Extract campaign name from experiment path */
export function extractCampaign(path) {
  if (!path) return 'Other';
  const parts = path.split('/');
  const expIdx = parts.indexOf('experiments');
  if (expIdx === -1 || expIdx + 1 >= parts.length) return 'Other';
  const raw = parts[expIdx + 1];
  if (!raw) return 'Other';
  // Strip leading date pattern (YYYY-MM-)
  const stripped = raw.replace(/^\d{4}-\d{2}-/, '');
  // Replace hyphens with spaces, title case
  return stripped
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const STATUS_COLORS = {
  running: 'var(--green)',
  paused: 'var(--yellow)',
  completed: 'var(--text-muted)',
};

export const STATUS_LABELS = {
  running: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

export function sortExperiments(list, sortBy, desc) {
  const sorted = [...list];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'last_modified': {
        const ta = a.last_modified ? new Date(a.last_modified).getTime() : 0;
        const tb = b.last_modified ? new Date(b.last_modified).getTime() : 0;
        cmp = ta - tb;
        break;
      }
      case 'name':
        cmp = (a.name || '').localeCompare(b.name || '');
        break;
      case 'best_score':
        cmp = (a.best_score ?? -Infinity) - (b.best_score ?? -Infinity);
        break;
      case 'generation':
        cmp = (a.current_generation ?? 0) - (b.current_generation ?? 0);
        break;
      case 'programs':
        cmp = (a.total_programs ?? 0) - (b.total_programs ?? 0);
        break;
      default:
        break;
    }
    return desc ? -cmp : cmp;
  });
  return sorted;
}

/**
 * Group a sorted experiment list by the given groupBy key.
 * Returns an array of { key, title, color, dotClass, experiments }.
 */
export function groupExperiments(sorted, groupBy) {
  switch (groupBy) {
    case 'status': {
      const buckets = { running: [], paused: [], completed: [] };
      for (const exp of sorted) {
        const key = exp.status === 'running' || exp.status === 'paused' ? exp.status : 'completed';
        buckets[key].push(exp);
      }
      const groups = [];
      for (const status of ['running', 'paused', 'completed']) {
        if (buckets[status].length > 0) {
          groups.push({
            key: status,
            title: STATUS_LABELS[status],
            color: STATUS_COLORS[status],
            dotClass: status === 'running' ? 'pulse-dot' : '',
            experiments: buckets[status],
          });
        }
      }
      return groups;
    }

    case 'campaign': {
      const buckets = new Map();
      for (const exp of sorted) {
        const campaign = extractCampaign(exp.path);
        if (!buckets.has(campaign)) buckets.set(campaign, []);
        buckets.get(campaign).push(exp);
      }
      const keys = [...buckets.keys()].sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
      });
      return keys.map((key) => ({
        key,
        title: key,
        color: 'var(--accent)',
        dotClass: '',
        experiments: buckets.get(key),
      }));
    }

    case 'framework': {
      const buckets = new Map();
      for (const exp of sorted) {
        const fw = exp.framework || 'Unknown';
        if (!buckets.has(fw)) buckets.set(fw, []);
        buckets.get(fw).push(exp);
      }
      const keys = [...buckets.keys()].sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return a.localeCompare(b);
      });
      return keys.map((key) => ({
        key,
        title: key,
        color: 'var(--cyan)',
        dotClass: '',
        experiments: buckets.get(key),
      }));
    }

    case 'none':
    default:
      return [{
        key: 'all',
        title: null,
        color: null,
        dotClass: '',
        experiments: sorted,
      }];
  }
}
