import { formatTimestamp, shortId, fmt } from '../../lib/utils';
import { islandColor } from '../../lib/colors';

export default function MigrationTimeline({ migrations = [] }) {
  if (migrations.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No migration events recorded.</div>;
  }

  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      {migrations.map((m, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid rgba(46,51,72,0.3)',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 100 }}>
            {formatTimestamp(m.timestamp)}
          </span>
          <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.8rem' }}>
            {shortId(m.program_id)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: islandColor(m.from_island),
            }} />
            <span style={{ color: 'var(--text-muted)' }}>{'\u2192'}</span>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: islandColor(m.to_island),
            }} />
          </div>
          <span style={{ color: 'var(--green)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {fmt(m.score)}
          </span>
        </div>
      ))}
    </div>
  );
}
