import { Link } from 'react-router-dom';
import { fmt, timeAgo } from '../../lib/utils';
import StatusBadge, { FrameworkBadge } from './StatusBadge';

export default function ExperimentCard({ experiment }) {
  const e = experiment;
  return (
    <Link to={`/experiment/${e.id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover" style={{ cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: e.status === 'running' ? 'var(--green)' : e.status === 'paused' ? 'var(--yellow)' : 'var(--text-muted)',
            }}
            className={e.status === 'running' ? 'pulse-dot' : ''}
          />
          <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1, color: 'var(--text-primary)' }}>
            {e.name}
          </span>
          <FrameworkBadge framework={e.framework} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <StatusBadge status={e.status} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {timeAgo(e.last_modified)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div className="stat-label">Programs</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fmt(e.total_programs, 0)}</div>
          </div>
          <div>
            <div className="stat-label">Best Score</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--green)' }}>{fmt(e.best_score)}</div>
          </div>
          <div>
            <div className="stat-label">Generation</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{e.current_generation}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
