import { useWebSocketStore } from '../../stores/websocketStore';
import { timeAgo } from '../../lib/utils';

export default function ActivityFeed({ experimentId }) {
  const events = useWebSocketStore((s) => s.events);

  const filtered = experimentId
    ? events.filter((e) => e.experiment_id === experimentId)
    : events;

  if (filtered.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
        Waiting for events...
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 300, overflow: 'auto' }}>
      {filtered.slice(0, 50).map((event, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            borderBottom: '1px solid rgba(46,51,72,0.3)',
            fontSize: '0.8rem',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: event.type === 'improvement' ? 'var(--green)' :
              event.type === 'migration' ? 'var(--orange)' : 'var(--blue)',
          }} />
          <span style={{ color: 'var(--text-secondary)' }}>{event.type}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.7rem' }}>
            {timeAgo(event.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
