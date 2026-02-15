import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePrograms } from '../hooks/usePrograms';
import { fetchEmbeddings } from '../lib/api';
import EmbeddingScatter from '../components/visualizations/EmbeddingScatter';
import EmbeddingScatter3D from '../components/visualizations/EmbeddingScatter3D';
import SimilarityHeatmap from '../components/visualizations/SimilarityHeatmap';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function EmbeddingPage() {
  const { experimentId } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'
  const { data, isLoading } = usePrograms(experimentId, { page: 1, page_size: 500 });

  const { data: embeddingsData, isLoading: embeddingsLoading } = useQuery({
    queryKey: ['embeddings', experimentId],
    queryFn: () => fetchEmbeddings(experimentId, 200),
    enabled: !!experimentId,
  });

  if (isLoading) return <LoadingSpinner text="Loading embeddings..." />;

  const programs = data?.items || [];
  const has3D = programs.some((p) => p.embedding_3d && p.embedding_3d.length === 3);

  const handleSelect = (programId) => {
    navigate(`/experiment/${experimentId}/programs/${programId}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Embedding Space</h2>

        {has3D && (
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('2d')}
              style={{
                padding: '4px 12px', fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                background: viewMode === '2d' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: viewMode === '2d' ? '#fff' : 'var(--text-secondary)',
                fontWeight: viewMode === '2d' ? 600 : 400,
              }}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              style={{
                padding: '4px 12px', fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                borderLeft: '1px solid var(--border)',
                background: viewMode === '3d' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: viewMode === '3d' ? '#fff' : 'var(--text-secondary)',
                fontWeight: viewMode === '3d' ? 600 : 400,
              }}
            >
              3D
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {viewMode === '2d' ? (
          <EmbeddingScatter programs={programs} onSelect={handleSelect} />
        ) : (
          <EmbeddingScatter3D programs={programs} onSelect={handleSelect} />
        )}
      </div>

      {/* Similarity Heatmap */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Embedding Similarity</h3>
        {embeddingsLoading ? (
          <LoadingSpinner text="Computing similarity matrix..." />
        ) : (
          <SimilarityHeatmap data={embeddingsData} />
        )}
      </div>
    </div>
  );
}
