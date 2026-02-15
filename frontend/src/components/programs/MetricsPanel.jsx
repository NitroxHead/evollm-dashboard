import { fmt } from '../../lib/utils';

export default function MetricsPanel({ metrics }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No metrics available.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="card" style={{ padding: '12px 16px' }}>
          <div className="stat-label">{key}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'monospace', marginTop: 4 }}>
            {fmt(value)}
          </div>
        </div>
      ))}
    </div>
  );
}
