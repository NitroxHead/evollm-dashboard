import { useExperiments } from '../hooks/useExperiments';
import ExperimentList from '../components/experiments/ExperimentList';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DashboardHome() {
  const { data: experiments, isLoading, error } = useExperiments();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>EvoLLM Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
        Monitoring evolutionary code experiments
      </p>

      {isLoading && <LoadingSpinner text="Discovering experiments..." />}

      {error && (
        <div className="card" style={{ color: 'var(--red)', marginBottom: 16 }}>
          Error loading experiments: {error.message}
        </div>
      )}

      {experiments && experiments.length === 0 && !isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>{'\uD83D\uDD0D'}</div>
          <h3 style={{ marginBottom: 8 }}>No experiments found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Place experiment data (checkpoint directories, .sqlite files, etc.)
            inside the evollm-dashboard/ directory.
          </p>
        </div>
      )}

      {experiments && experiments.length > 0 && (
        <ExperimentList experiments={experiments} />
      )}
    </div>
  );
}
