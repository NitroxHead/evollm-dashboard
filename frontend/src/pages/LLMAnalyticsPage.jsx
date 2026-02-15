import { useParams } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function LLMAnalyticsPage() {
  const { experimentId } = useParams();
  const { data: analytics, isLoading } = useAnalytics(experimentId);

  if (isLoading) return <LoadingSpinner text="Loading analytics..." />;

  if (!analytics || analytics.total_cost === 0) {
    return (
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>LLM Analytics</h2>
        <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          No cost or analytics data available. This feature requires experiments with API cost tracking in metadata.
        </div>
      </div>
    );
  }

  const fmt = (v) => v != null ? '$' + v.toFixed(4) : '$0.00';

  // Prepare cost time series for stacked area
  const costData = analytics.cost_time_series.map((pt) => ({
    generation: pt.generation,
    'API Cost': pt.api_cost,
    'Embed Cost': pt.embed_cost,
    'Novelty Cost': pt.novelty_cost,
    'Meta Cost': pt.meta_cost,
    'Cumulative': pt.cumulative_cost,
  }));

  // Model usage data
  const modelData = analytics.model_usage.map((m) => {
    const parts = m.model_name.split('/');
    return {
      name: parts[parts.length - 1],
      full_name: m.model_name,
      uses: m.total_uses,
      cost: m.total_cost,
      improvement_rate: (m.improvement_rate * 100).toFixed(1),
      avg_delta: m.avg_score_delta.toFixed(4),
    };
  });

  // Posteriors data
  const allModels = new Set();
  analytics.model_posteriors_over_time.forEach((pt) => {
    Object.keys(pt.posteriors).forEach((k) => allModels.add(k));
  });
  const modelList = [...allModels];

  const posteriorData = analytics.model_posteriors_over_time.map((pt) => {
    const row = { generation: pt.generation };
    modelList.forEach((m) => {
      row[m] = pt.posteriors[m] || 0;
    });
    return row;
  });

  // Patch type pie data
  const patchData = Object.entries(analytics.patch_type_distribution).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>LLM Analytics</h2>

      {/* Summary stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Cost" value={fmt(analytics.total_cost)} />
        <StatCard label="API Cost" value={fmt(analytics.total_api_cost)} />
        <StatCard label="Embed Cost" value={fmt(analytics.total_embed_cost)} />
        <StatCard label="Novelty Cost" value={fmt(analytics.total_novelty_cost)} />
        <StatCard label="Meta Cost" value={fmt(analytics.total_meta_cost)} />
      </div>

      {/* Cumulative Cost Over Time */}
      {costData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Cumulative Cost by Generation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="generation" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => '$' + v.toFixed(2)} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v) => ['$' + v.toFixed(4)]}
              />
              <Legend />
              <Area type="monotone" dataKey="API Cost" stackId="1" fill="#6366f1" stroke="#6366f1" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Embed Cost" stackId="1" fill="#22c55e" stroke="#22c55e" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Novelty Cost" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Meta Cost" stackId="1" fill="#ef4444" stroke="#ef4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Model Usage */}
        {modelData.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Model Usage</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Bar dataKey="uses" fill="#6366f1" name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Model Success Rates */}
        {modelData.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Model Success Rates</h3>
            <div style={{ overflow: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Calls</th>
                    <th>Cost</th>
                    <th>Impr. Rate</th>
                    <th>Avg Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {modelData.map((m) => (
                    <tr key={m.full_name}>
                      <td title={m.full_name}>{m.name}</td>
                      <td>{m.uses}</td>
                      <td style={{ fontFamily: 'monospace' }}>${m.cost.toFixed(4)}</td>
                      <td style={{ color: parseFloat(m.improvement_rate) > 20 ? 'var(--green)' : 'var(--text-secondary)' }}>
                        {m.improvement_rate}%
                      </td>
                      <td style={{ fontFamily: 'monospace', color: parseFloat(m.avg_delta) > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {m.avg_delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Model Posteriors Over Time */}
        {posteriorData.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>LLM Posteriors Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={posteriorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="generation" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 1]} tickFormatter={(v) => (v * 100).toFixed(0) + '%'} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
                  formatter={(v) => [(v * 100).toFixed(1) + '%']}
                />
                <Legend />
                {modelList.map((m, i) => {
                  const parts = m.split('/');
                  const shortName = parts[parts.length - 1];
                  return (
                    <Area
                      key={m}
                      type="monotone"
                      dataKey={m}
                      name={shortName}
                      stackId="1"
                      fill={COLORS[i % COLORS.length]}
                      stroke={COLORS[i % COLORS.length]}
                      fillOpacity={0.7}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Patch Type Distribution */}
        {patchData.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Patch Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={patchData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {patchData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
