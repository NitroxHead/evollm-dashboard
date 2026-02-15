import { Link } from 'react-router-dom';
import { fmt, shortId, formatTimestamp } from '../../lib/utils';
import { scoreToColor, islandColor } from '../../lib/colors';

export default function ProgramTable({ programs, experimentId, sortBy, sortDesc, onSort, scores }) {
  const minScore = scores ? Math.min(...scores) : 0;
  const maxScore = scores ? Math.max(...scores) : 1;

  const handleSort = (col) => {
    if (onSort) {
      if (sortBy === col) onSort(col, !sortDesc);
      else onSort(col, true);
    }
  };

  const arrow = (col) => {
    if (sortBy !== col) return '';
    return sortDesc ? ' \u25BC' : ' \u25B2';
  };

  return (
    <div style={{ overflow: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('generation')}>ID{arrow('generation')}</th>
            <th onClick={() => handleSort('generation')}>Gen{arrow('generation')}</th>
            <th>Island</th>
            <th onClick={() => handleSort('score')}>Score{arrow('score')}</th>
            <th>Correct</th>
            <th onClick={() => handleSort('complexity')}>Complexity{arrow('complexity')}</th>
            <th>Archive</th>
            <th>Model</th>
            <th>Patch</th>
            <th>Cost</th>
            <th onClick={() => handleSort('children_count')}>Children{arrow('children_count')}</th>
            <th onClick={() => handleSort('timestamp')}>Time{arrow('timestamp')}</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id}>
              <td>
                <Link
                  to={`/experiment/${experimentId}/programs/${p.id}`}
                  style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {shortId(p.id)}
                </Link>
              </td>
              <td>{p.generation}</td>
              <td>
                {p.island_id != null && (
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: islandColor(p.island_id), marginRight: 4,
                  }} />
                )}
                {p.island_id != null ? p.island_id : '\u2014'}
              </td>
              <td style={{ color: scoreToColor(p.score, minScore, maxScore), fontWeight: 600, fontFamily: 'monospace' }}>
                {fmt(p.score)}
              </td>
              <td style={{ color: p.correct ? 'var(--green)' : 'var(--red)' }}>
                {p.correct ? '\u2713' : '\u2717'}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmt(p.complexity, 1)}</td>
              <td>{p.in_archive ? '\u2B50' : ''}</td>
              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={p.metadata?.llm_result?.model_name || p.metadata?.model_name || ''}>
                {(() => {
                  const name = p.metadata?.llm_result?.model_name || p.metadata?.model_name;
                  if (!name) return '\u2014';
                  const parts = name.split('/');
                  return parts[parts.length - 1];
                })()}
              </td>
              <td>
                {(() => {
                  const pt = p.metadata?.patch_type;
                  if (!pt) return '\u2014';
                  const colors = { diff: '#3b82f6', full: '#22c55e', cross: '#f97316' };
                  return (
                    <span style={{
                      background: `${colors[pt] || 'var(--text-muted)'}22`,
                      color: colors[pt] || 'var(--text-muted)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 500,
                    }}>
                      {pt}
                    </span>
                  );
                })()}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {p.metadata?.api_costs != null ? '$' + p.metadata.api_costs.toFixed(4) : '\u2014'}
              </td>
              <td>{p.children_count}</td>
              <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTimestamp(p.timestamp)}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {p.changes_description || '\u2014'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
