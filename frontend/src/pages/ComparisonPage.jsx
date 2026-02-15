import { useSearchParams } from 'react-router-dom';
import { useExperiment } from '../hooks/useExperiments';
import { useMetrics } from '../hooks/useMetrics';
import FitnessCurve from '../components/visualizations/FitnessCurve';
import { fmt } from '../lib/utils';
import { FrameworkBadge } from '../components/experiments/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ComparisonPage() {
  const [params] = useSearchParams();
  const idA = params.get('a');
  const idB = params.get('b');

  const { data: expA, isLoading: loadA } = useExperiment(idA);
  const { data: expB, isLoading: loadB } = useExperiment(idB);
  const { data: metricsA } = useMetrics(idA);
  const { data: metricsB } = useMetrics(idB);

  if (!idA || !idB) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h3>Experiment Comparison</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Use URL params: /compare?a=experiment_id_1&b=experiment_id_2
        </p>
      </div>
    );
  }

  if (loadA || loadB) return <LoadingSpinner text="Loading experiments..." />;

  const CompareCol = ({ exp, metrics, label }) => (
    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
        {label}: {exp?.name || 'Unknown'}
        <span style={{ marginLeft: 8 }}><FrameworkBadge framework={exp?.framework} /></span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ padding: '8px 12px' }}>
          <div className="stat-label">Programs</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmt(metrics?.total_programs, 0)}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px' }}>
          <div className="stat-label">Best Score</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--green)' }}>{fmt(metrics?.best_score)}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px' }}>
          <div className="stat-label">Mean Score</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmt(metrics?.mean_score)}</div>
        </div>
        <div className="card" style={{ padding: '8px 12px' }}>
          <div className="stat-label">Generation</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>{metrics?.current_generation}</div>
        </div>
      </div>

      <div className="card">
        <FitnessCurve
          bestHistory={metrics?.best_score_history || []}
          meanHistory={metrics?.mean_score_history || []}
          perIslandBest={metrics?.per_island_best || {}}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Experiment Comparison</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        <CompareCol exp={expA} metrics={metricsA} label="A" />
        <div style={{ width: 1, background: 'var(--border)' }} />
        <CompareCol exp={expB} metrics={metricsB} label="B" />
      </div>
    </div>
  );
}
