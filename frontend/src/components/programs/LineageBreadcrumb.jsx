import { Link } from 'react-router-dom';
import { shortId } from '../../lib/utils';

export default function LineageBreadcrumb({ programId, parentId, experimentId }) {
  // Simple breadcrumb showing parent -> current
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>Lineage:</span>
      {parentId ? (
        <>
          <Link
            to={`/experiment/${experimentId}/programs/${parentId}`}
            style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace' }}
          >
            {shortId(parentId)}
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>{'\u2192'}</span>
        </>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>seed {'\u2192'}</span>
      )}
      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent)' }}>
        {shortId(programId)}
      </span>
    </div>
  );
}
