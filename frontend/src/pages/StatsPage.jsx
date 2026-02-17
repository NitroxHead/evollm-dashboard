import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useExperiments } from '../hooks/useExperiments';
import { useWebSocketStore } from '../stores/websocketStore';
import { fetchMetrics, fetchAnalytics } from '../lib/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fmt } from '../lib/utils';
import { extractCampaign } from '../lib/experiments';

function StatCard({ label, value, sub, color, wide }) {
  return (
    <div className="card stats-card" style={wide ? { gridColumn: 'span 2' } : {}}>
      <div className="stats-card-value" style={color ? { color } : {}}>{value}</div>
      <div className="stats-card-label">{label}</div>
      {sub && <div className="stats-card-sub">{sub}</div>}
    </div>
  );
}

function FrameworkRow({ name, count, programs, bestScore, generations, runtime, llmCalls }) {
  return (
    <tr>
      <td><span className="stats-fw-badge">{name}</span></td>
      <td>{count}</td>
      <td>{fmt(programs, 0)}</td>
      <td style={{ color: 'var(--emerald)' }}>{bestScore != null ? fmt(bestScore) : '-'}</td>
      <td>{fmt(generations, 0)}</td>
      <td>{runtime > 0 ? formatHms(runtime) : '-'}</td>
      <td>{llmCalls > 0 ? fmt(llmCalls, 0) : '-'}</td>
    </tr>
  );
}

function CampaignRow({ name, count, running, bestScore, totalPrograms }) {
  return (
    <tr>
      <td><span className="stats-campaign-name">{name}</span></td>
      <td>{count}</td>
      <td>
        {running > 0 ? (
          <span style={{ color: 'var(--green)' }}>{running} running</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>idle</span>
        )}
      </td>
      <td>{fmt(totalPrograms, 0)}</td>
      <td style={{ color: 'var(--emerald)' }}>{bestScore != null ? fmt(bestScore) : '-'}</td>
    </tr>
  );
}

function ExperimentRow({ exp, rank, metrics }) {
  const age = exp.last_modified
    ? formatDuration((Date.now() / 1000) - exp.last_modified)
    : '-';
  return (
    <tr>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{rank}</td>
      <td><span style={{ fontWeight: 600 }}>{exp.name}</span></td>
      <td><span className={`badge badge-${exp.status}`}>{exp.status}</span></td>
      <td style={{ color: 'var(--emerald)', fontWeight: 600 }}>
        {exp.best_score != null ? fmt(exp.best_score) : '-'}
      </td>
      <td>{fmt(exp.total_programs, 0)}</td>
      <td>{exp.current_generation}</td>
      <td style={{ fontSize: '0.75rem' }}>
        {metrics?.time_elapsed > 0 ? formatHms(metrics.time_elapsed) : '-'}
      </td>
      <td style={{ fontSize: '0.75rem' }}>
        {metrics?.total_llm_calls > 0 ? fmt(metrics.total_llm_calls, 0) : '-'}
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{age}</td>
    </tr>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatHms(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTokens(tokens) {
  if (tokens >= 1e9) return `${(tokens / 1e9).toFixed(1)}B`;
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`;
  if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(1)}K`;
  return String(tokens);
}

function formatCost(cost) {
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}K`;
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost > 0) return `$${cost.toFixed(4)}`;
  return '-';
}

export default function StatsPage() {
  const { data: experiments, isLoading } = useExperiments();
  const events = useWebSocketStore((s) => s.events);

  // Fetch metrics for all experiments
  const metricsQueries = useQueries({
    queries: (experiments || []).map((exp) => ({
      queryKey: ['metrics', exp.id],
      queryFn: async () => {
        const data = await fetchMetrics(exp.id);
        return { id: exp.id, ...data.summary };
      },
      staleTime: 30000,
      retry: 1,
    })),
  });

  // Fetch analytics for all experiments
  const analyticsQueries = useQueries({
    queries: (experiments || []).map((exp) => ({
      queryKey: ['analytics', exp.id],
      queryFn: async () => {
        const data = await fetchAnalytics(exp.id);
        return { id: exp.id, ...data.analytics };
      },
      staleTime: 30000,
      retry: 1,
    })),
  });

  // Build lookup maps
  const metricsMap = useMemo(() => {
    const m = {};
    for (const q of metricsQueries) {
      if (q.data) m[q.data.id] = q.data;
    }
    return m;
  }, [metricsQueries]);

  const analyticsMap = useMemo(() => {
    const m = {};
    for (const q of analyticsQueries) {
      if (q.data) m[q.data.id] = q.data;
    }
    return m;
  }, [analyticsQueries]);

  const metricsLoading = metricsQueries.some((q) => q.isLoading);

  const stats = useMemo(() => {
    if (!experiments || experiments.length === 0) return null;

    const running = experiments.filter((e) => e.status === 'running');
    const paused = experiments.filter((e) => e.status === 'paused');
    const completed = experiments.filter((e) => e.status !== 'running' && e.status !== 'paused');

    const totalPrograms = experiments.reduce((s, e) => s + (e.total_programs || 0), 0);
    const totalGenerations = experiments.reduce((s, e) => s + (e.current_generation || 0), 0);
    const totalIslands = experiments.reduce((s, e) => s + (e.num_islands || 0), 0);

    const bestExp = experiments.reduce((best, e) => {
      if (e.best_score != null && (best === null || e.best_score > best.best_score)) return e;
      return best;
    }, null);

    const avgScore = experiments.reduce((sum, e) => sum + (e.best_score || 0), 0) / experiments.length;
    const avgPrograms = totalPrograms / experiments.length;

    // Aggregate from metrics
    let totalRuntime = 0;
    let totalLlmCalls = 0;
    let totalTokens = 0;
    let totalProgramsPerMin = 0;
    let avgImprovementRate = 0;
    let metricsCount = 0;

    for (const exp of experiments) {
      const m = metricsMap[exp.id];
      if (m) {
        totalRuntime += m.time_elapsed || 0;
        totalLlmCalls += m.total_llm_calls || 0;
        totalTokens += m.total_tokens || 0;
        totalProgramsPerMin += m.programs_per_minute || 0;
        avgImprovementRate += m.improvement_rate || 0;
        metricsCount++;
      }
    }
    if (metricsCount > 0) {
      avgImprovementRate /= metricsCount;
    }

    // Aggregate from analytics (costs)
    let totalCost = 0;
    let totalApiCost = 0;
    let modelUsageMap = new Map();

    for (const exp of experiments) {
      const a = analyticsMap[exp.id];
      if (a) {
        totalCost += a.total_cost || 0;
        totalApiCost += a.total_api_cost || 0;
        if (a.model_usage) {
          for (const mu of a.model_usage) {
            const key = mu.model_name;
            if (!modelUsageMap.has(key)) {
              modelUsageMap.set(key, { uses: 0, cost: 0, improvements: 0 });
            }
            const entry = modelUsageMap.get(key);
            entry.uses += mu.total_uses || 0;
            entry.cost += mu.total_cost || 0;
            entry.improvements += mu.improvements || 0;
          }
        }
      }
    }

    // Framework breakdown
    const frameworkMap = new Map();
    for (const exp of experiments) {
      const fw = exp.framework || 'unknown';
      if (!frameworkMap.has(fw)) {
        frameworkMap.set(fw, { count: 0, programs: 0, bestScore: null, generations: 0, runtime: 0, llmCalls: 0 });
      }
      const entry = frameworkMap.get(fw);
      entry.count++;
      entry.programs += exp.total_programs || 0;
      entry.generations += exp.current_generation || 0;
      const m = metricsMap[exp.id];
      if (m) {
        entry.runtime += m.time_elapsed || 0;
        entry.llmCalls += m.total_llm_calls || 0;
      }
      if (exp.best_score != null && (entry.bestScore === null || exp.best_score > entry.bestScore)) {
        entry.bestScore = exp.best_score;
      }
    }

    // Campaign breakdown
    const campaignMap = new Map();
    for (const exp of experiments) {
      const campaign = extractCampaign(exp.path);
      if (!campaignMap.has(campaign)) {
        campaignMap.set(campaign, { count: 0, running: 0, bestScore: null, totalPrograms: 0 });
      }
      const entry = campaignMap.get(campaign);
      entry.count++;
      entry.totalPrograms += exp.total_programs || 0;
      if (exp.status === 'running') entry.running++;
      if (exp.best_score != null && (entry.bestScore === null || exp.best_score > entry.bestScore)) {
        entry.bestScore = exp.best_score;
      }
    }

    // Top experiments by score
    const topByScore = [...experiments]
      .filter((e) => e.best_score != null)
      .sort((a, b) => b.best_score - a.best_score)
      .slice(0, 10);

    // Most productive (most programs)
    const topByPrograms = [...experiments]
      .sort((a, b) => (b.total_programs || 0) - (a.total_programs || 0))
      .slice(0, 10);

    // Recent event stats
    const eventCounts = {};
    for (const ev of events) {
      eventCounts[ev.type] = (eventCounts[ev.type] || 0) + 1;
    }

    // Time span
    const timestamps = experiments.map((e) => e.last_modified).filter((t) => t > 0);
    const oldest = timestamps.length ? Math.min(...timestamps) : 0;
    const newest = timestamps.length ? Math.max(...timestamps) : 0;
    const spanSeconds = newest - oldest;

    return {
      total: experiments.length,
      running: running.length,
      paused: paused.length,
      completed: completed.length,
      totalPrograms,
      totalGenerations,
      totalIslands,
      bestExp,
      avgScore,
      avgPrograms,
      totalRuntime,
      totalLlmCalls,
      totalTokens,
      totalProgramsPerMin,
      avgImprovementRate,
      totalCost,
      totalApiCost,
      modelUsage: [...modelUsageMap.entries()].sort((a, b) => b[1].uses - a[1].uses),
      frameworks: [...frameworkMap.entries()].sort((a, b) => b[1].count - a[1].count),
      campaigns: [...campaignMap.entries()]
        .sort((a, b) => {
          if (a[0] === 'Other') return 1;
          if (b[0] === 'Other') return -1;
          return b[1].count - a[1].count;
        }),
      topByScore,
      topByPrograms,
      eventCounts,
      totalEvents: events.length,
      spanSeconds,
    };
  }, [experiments, events, metricsMap, analyticsMap]);

  if (isLoading) return <LoadingSpinner text="Loading stats..." />;

  if (!stats) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ margin: '0 0 8px' }}>No experiments yet</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Stats will appear once experiments are discovered.
        </p>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">Observatory Stats</h1>
        <p className="stats-subtitle">
          Aggregate view across {stats.total} experiment{stats.total !== 1 ? 's' : ''}
          {stats.spanSeconds > 0 && <> spanning {formatHms(stats.spanSeconds)}</>}
          {metricsLoading && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>(loading metrics...)</span>}
        </p>
      </div>

      {/* Overview grid */}
      <div className="stats-grid">
        <StatCard label="Experiments" value={stats.total} sub={`${stats.running} running, ${stats.paused} paused, ${stats.completed} completed`} />
        <StatCard label="Total Programs" value={fmt(stats.totalPrograms, 0)} sub={`~${fmt(stats.avgPrograms, 0)} per experiment`} />
        <StatCard
          label="Best Score"
          value={stats.bestExp ? fmt(stats.bestExp.best_score) : '-'}
          color="var(--emerald)"
          sub={stats.bestExp ? stats.bestExp.name : null}
        />
        <StatCard label="Total Generations" value={fmt(stats.totalGenerations, 0)} />
      </div>

      {/* Compute / LLM stats */}
      <section className="stats-section">
        <h2 className="stats-section-title">Compute &amp; LLM Usage</h2>
        <div className="stats-grid">
          <StatCard
            label="Total Runtime"
            value={stats.totalRuntime > 0 ? formatHms(stats.totalRuntime) : '-'}
            color="var(--blue)"
          />
          <StatCard
            label="Total LLM Calls"
            value={stats.totalLlmCalls > 0 ? fmt(stats.totalLlmCalls, 0) : '-'}
            color="var(--accent)"
          />
          <StatCard
            label="Total Tokens"
            value={stats.totalTokens > 0 ? formatTokens(stats.totalTokens) : '-'}
            sub={stats.totalTokens > 0 ? `${fmt(stats.totalTokens, 0)} exact` : null}
          />
          <StatCard
            label="Programs / min"
            value={stats.totalProgramsPerMin > 0 ? fmt(stats.totalProgramsPerMin, 1) : '-'}
            sub="aggregate across all running"
          />
          <StatCard
            label="Avg Improvement Rate"
            value={stats.avgImprovementRate > 0 ? `${(stats.avgImprovementRate * 100).toFixed(1)}%` : '-'}
            color="var(--green)"
          />
          <StatCard label="Islands Active" value={stats.totalIslands} />
          {stats.totalCost > 0 && (
            <StatCard
              label="Total API Cost"
              value={formatCost(stats.totalCost)}
              color="var(--orange)"
              sub={stats.totalApiCost > 0 && stats.totalApiCost !== stats.totalCost ? `${formatCost(stats.totalApiCost)} LLM only` : null}
            />
          )}
          {stats.totalCost > 0 && stats.totalPrograms > 0 && (
            <StatCard
              label="Cost / Program"
              value={formatCost(stats.totalCost / stats.totalPrograms)}
              color="var(--yellow)"
            />
          )}
        </div>
      </section>

      {/* Model usage breakdown */}
      {stats.modelUsage.length > 0 && (
        <section className="stats-section">
          <h2 className="stats-section-title">Model Usage</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Cost</th>
                  <th>Improvements</th>
                </tr>
              </thead>
              <tbody>
                {stats.modelUsage.map(([name, data]) => (
                  <tr key={name}>
                    <td><span className="stats-fw-badge">{name}</span></td>
                    <td>{fmt(data.uses, 0)}</td>
                    <td style={{ color: 'var(--orange)' }}>{formatCost(data.cost)}</td>
                    <td style={{ color: 'var(--green)' }}>{fmt(data.improvements, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Live session */}
      {stats.totalEvents > 0 && (
        <section className="stats-section">
          <h2 className="stats-section-title">Live Session Activity</h2>
          <div className="stats-grid">
            <StatCard label="Events Captured" value={stats.totalEvents} />
            {stats.eventCounts.new_program && (
              <StatCard label="New Programs" value={stats.eventCounts.new_program} color="var(--blue)" />
            )}
            {stats.eventCounts.improvement && (
              <StatCard label="Improvements" value={stats.eventCounts.improvement} color="var(--green)" />
            )}
            {stats.eventCounts.generation_complete && (
              <StatCard label="Generations Completed" value={stats.eventCounts.generation_complete} color="var(--accent)" />
            )}
            {stats.eventCounts.migration && (
              <StatCard label="Migrations" value={stats.eventCounts.migration} color="var(--cyan)" />
            )}
          </div>
        </section>
      )}

      {/* Framework breakdown */}
      <section className="stats-section">
        <h2 className="stats-section-title">By Framework</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Experiments</th>
                <th>Programs</th>
                <th>Best Score</th>
                <th>Generations</th>
                <th>Runtime</th>
                <th>LLM Calls</th>
              </tr>
            </thead>
            <tbody>
              {stats.frameworks.map(([name, data]) => (
                <FrameworkRow key={name} name={name} {...data} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Campaign breakdown */}
      {stats.campaigns.length > 1 && (
        <section className="stats-section">
          <h2 className="stats-section-title">By Campaign</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Experiments</th>
                  <th>Status</th>
                  <th>Programs</th>
                  <th>Best Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map(([name, data]) => (
                  <CampaignRow key={name} name={name} {...data} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section className="stats-section">
        <h2 className="stats-section-title">Top Experiments by Score</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Experiment</th>
                <th>Status</th>
                <th>Best Score</th>
                <th>Programs</th>
                <th>Gen</th>
                <th>Runtime</th>
                <th>LLM Calls</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {stats.topByScore.map((exp, i) => (
                <ExperimentRow key={exp.id} exp={exp} rank={i + 1} metrics={metricsMap[exp.id]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Most productive */}
      <section className="stats-section">
        <h2 className="stats-section-title">Most Productive (by Programs)</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Experiment</th>
                <th>Status</th>
                <th>Best Score</th>
                <th>Programs</th>
                <th>Gen</th>
                <th>Runtime</th>
                <th>LLM Calls</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {stats.topByPrograms.map((exp, i) => (
                <ExperimentRow key={exp.id} exp={exp} rank={i + 1} metrics={metricsMap[exp.id]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
