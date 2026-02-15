import { islandColor } from '../../lib/colors';
import { fmt } from '../../lib/utils';

export default function IslandTopology({ islands = [], migrations = [] }) {
  if (islands.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No island data.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {islands.map((isl) => (
        <div
          key={isl.island_id}
          className="card"
          style={{ borderLeft: `3px solid ${islandColor(isl.island_id)}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: islandColor(isl.island_id),
              }}
            />
            <span style={{ fontWeight: 600 }}>Island {isl.island_id}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
            <div>
              <div className="stat-label">Programs</div>
              <div style={{ fontWeight: 600 }}>{isl.program_count}</div>
            </div>
            <div>
              <div className="stat-label">Best Score</div>
              <div style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(isl.best_score)}</div>
            </div>
            <div>
              <div className="stat-label">Generation</div>
              <div style={{ fontWeight: 600 }}>{isl.current_generation}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
