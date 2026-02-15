import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLineage } from '../hooks/useLineage';
import { fetchBestPath } from '../lib/api';
import GenealogyTree from '../components/visualizations/GenealogyTree';
import BestPathView from '../components/visualizations/BestPathView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useState } from 'react';

export default function GenealogyPage() {
  const { experimentId } = useParams();
  const navigate = useNavigate();
  const [rootId, setRootId] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'bestpath'
  const { data: tree, isLoading } = useLineage(experimentId, rootId);

  const { data: bestPathData, isLoading: bestPathLoading } = useQuery({
    queryKey: ['best-path', experimentId],
    queryFn: () => fetchBestPath(experimentId),
    enabled: viewMode === 'bestpath' && !!experimentId,
  });

  const handleNodeClick = (nodeId) => {
    navigate(`/experiment/${experimentId}/programs/${nodeId}`);
  };

  if (isLoading && viewMode === 'tree') return <LoadingSpinner text="Building genealogy tree..." />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Genealogy</h2>

        {/* View mode toggle */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('tree')}
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'tree' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: viewMode === 'tree' ? '#fff' : 'var(--text-secondary)',
              fontWeight: viewMode === 'tree' ? 600 : 400,
            }}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('bestpath')}
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
              background: viewMode === 'bestpath' ? '#eab308' : 'var(--bg-tertiary)',
              color: viewMode === 'bestpath' ? '#000' : 'var(--text-secondary)',
              fontWeight: viewMode === 'bestpath' ? 600 : 400,
            }}
          >
            Best Path
          </button>
        </div>

        {viewMode === 'tree' && tree && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {Object.keys(tree.nodes).length} programs | {tree.root_ids?.length || 0} roots | Golden path: {tree.best_path?.length || 0} steps
          </span>
        )}
        {viewMode === 'tree' && rootId && (
          <button className="btn" onClick={() => setRootId(null)}>
            {'\u2190'} Show Full Tree
          </button>
        )}
      </div>

      {viewMode === 'tree' && tree && <GenealogyTree tree={tree} onNodeClick={handleNodeClick} />}

      {viewMode === 'bestpath' && (
        bestPathLoading
          ? <LoadingSpinner text="Loading best path..." />
          : <BestPathView path={bestPathData?.path || []} experimentId={experimentId} />
      )}
    </div>
  );
}
