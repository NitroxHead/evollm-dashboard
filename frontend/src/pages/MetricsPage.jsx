import { useParams } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import { usePrograms } from '../hooks/usePrograms';
import FitnessCurve from '../components/visualizations/FitnessCurve';
import ScoreDistribution from '../components/visualizations/ScoreDistribution';
import MapElitesHeatmap from '../components/visualizations/MapElitesHeatmap';
import ParetoFront from '../components/visualizations/ParetoFront';
import DiversityChart from '../components/visualizations/DiversityChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fmt, formatDuration } from '../lib/utils';

export default function MetricsPage() {
  const { experimentId } = useParams();
  const { data: metrics, isLoading } = useMetrics(experimentId);
  const { data: programsData } = usePrograms(experimentId, { page: 1, page_size: 500, sort_by: 'score', sort_desc: true });

  if (isLoading) return <LoadingSpinner text="Computing metrics..." />;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Metrics & Analytics</h2>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Best', value: fmt(metrics?.best_score), color: 'var(--green)' },
          { label: 'Mean', value: fmt(metrics?.mean_score) },
          { label: 'Median', value: fmt(metrics?.median_score) },
          { label: 'Programs', value: fmt(metrics?.total_programs, 0) },
          { label: 'Rate', value: `${fmt(metrics?.programs_per_minute, 1)}/min` },
          { label: 'Elapsed', value: formatDuration(metrics?.time_elapsed) },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '10px 14px' }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: '1.2rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Fitness Curve</h3>
          <FitnessCurve
            bestHistory={metrics?.best_score_history || []}
            meanHistory={metrics?.mean_score_history || []}
            perIslandBest={metrics?.per_island_best || {}}
          />
        </div>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Score Distribution</h3>
          <ScoreDistribution scores={metrics?.score_distribution || []} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>MAP-Elites Coverage</h3>
          <MapElitesHeatmap gridData={metrics?.map_elites_grid} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Programs Over Time</h3>
          <DiversityChart programs={programsData?.items || []} />
        </div>
      </div>

      {/* Pareto Front */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Pareto Front</h3>
        <ParetoFront programs={programsData?.items || []} />
      </div>

      {/* LLM Usage & Convergence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>LLM Usage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="stat-label">Total LLM Calls</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fmt(metrics?.total_llm_calls, 0)}</div>
            </div>
            <div>
              <div className="stat-label">Total Tokens</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fmt(metrics?.total_tokens, 0)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Convergence</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="stat-label">Improvement Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: metrics?.improvement_rate > 0.1 ? 'var(--green)' : 'var(--yellow)' }}>
                {metrics ? `${(metrics.improvement_rate * 100).toFixed(1)}%` : '\u2014'}
              </div>
            </div>
            <div>
              <div className="stat-label">Status</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {metrics?.improvement_rate > 0.2 ? 'Exploring' :
                  metrics?.improvement_rate > 0.05 ? 'Converging' : 'Saturated'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
