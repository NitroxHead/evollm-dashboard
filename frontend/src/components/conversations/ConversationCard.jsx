import { Link } from 'react-router-dom';
import { fmt, shortId, formatTimestamp } from '../../lib/utils';

export default function ConversationCard({ entry, experimentId }) {
  const deltaColor = entry.improvement_delta > 0 ? 'var(--green)' : entry.improvement_delta < 0 ? 'var(--red)' : 'var(--text-muted)';
  const deltaSign = entry.improvement_delta > 0 ? '+' : '';

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link
          to={`/experiment/${experimentId}/programs/${entry.program_id}`}
          style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.8rem' }}
        >
          {shortId(entry.program_id)}
        </Link>

        <span style={{ color: deltaColor, fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {deltaSign}{fmt(entry.improvement_delta)}
        </span>

        {entry.mutation_type && (
          <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
            {entry.mutation_type}
          </span>
        )}

        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Gen {entry.generation} | {formatTimestamp(entry.timestamp)}
        </span>
      </div>

      {entry.code_diff && (
        <pre style={{
          background: 'var(--bg-tertiary)',
          padding: 8,
          borderRadius: 6,
          fontSize: '0.75rem',
          maxHeight: 120,
          overflow: 'hidden',
          margin: 0,
          color: 'var(--text-secondary)',
        }}>
          {entry.code_diff.slice(0, 300)}
          {entry.code_diff.length > 300 ? '...' : ''}
        </pre>
      )}
    </div>
  );
}
