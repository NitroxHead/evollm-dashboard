import { useParams } from 'react-router-dom';
import { useExperiment } from '../hooks/useExperiments';
import { useMetrics } from '../hooks/useMetrics';
import FitnessCurve from '../components/visualizations/FitnessCurve';
import ScoreDistribution from '../components/visualizations/ScoreDistribution';
import ActivityFeed from '../components/visualizations/ActivityFeed';
import ConfigViewer from '../components/experiments/ConfigViewer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fmt, formatDuration } from '../lib/utils';
import { useState } from 'react';

export default function ExperimentOverview() {
  const { experimentId } = useParams();
  const { data: experiment, isLoading } = useExperiment(experimentId);
  const { data: metrics } = useMetrics(experimentId);
  const [showConfig, setShowConfig] = useState(false);

  if (isLoading) return <LoadingSpinner text="Loading experiment..." />;
  if (!experiment) return <div style={{ color: 'var(--text-muted)' }}>Experiment not found.</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>{experiment.name}</h2>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Programs', value: fmt(metrics?.total_programs ?? experiment.total_programs, 0) },
          { label: 'Best Score', value: fmt(metrics?.best_score ?? experiment.best_score), color: 'var(--green)' },
          { label: 'Mean Score', value: fmt(metrics?.mean_score) },
          { label: 'Generation', value: metrics?.current_generation ?? experiment.current_generation },
          { label: 'Islands', value: experiment.num_islands },
          { label: 'Programs/min', value: fmt(metrics?.programs_per_minute, 1) },
          { label: 'Improvement Rate', value: metrics ? `${(metrics.improvement_rate * 100).toFixed(1)}%` : '\u2014' },
          { label: 'Time Elapsed', value: formatDuration(metrics?.time_elapsed) },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '12px 16px' }}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Fitness curve */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Fitness Over Generations</h3>
        <FitnessCurve
          bestHistory={metrics?.best_score_history || []}
          meanHistory={metrics?.mean_score_history || []}
          perIslandBest={metrics?.per_island_best || {}}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Score distribution */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Score Distribution</h3>
          <ScoreDistribution scores={metrics?.score_distribution || []} />
        </div>

        {/* Activity feed */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Activity Feed</h3>
          <ActivityFeed experimentId={experimentId} />
        </div>
      </div>

      {/* Config */}
      <button className="btn" onClick={() => setShowConfig(!showConfig)} style={{ marginBottom: 12 }}>
        {showConfig ? 'Hide' : 'Show'} Configuration
      </button>
      {showConfig && (
        <div className="card">
          <ConfigViewer config={experiment.config} />
        </div>
      )}
    </div>
  );
}
