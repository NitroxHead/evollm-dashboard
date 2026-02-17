import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useExperiments } from '../hooks/useExperiments';
import { useUiStore } from '../stores/uiStore';
import ExperimentCard from '../components/experiments/ExperimentCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fmt } from '../lib/utils';
import { sortExperiments, groupExperiments } from '../lib/experiments';

function StatusDot({ status }) {
  const colors = {
    running: 'var(--green)',
    paused: 'var(--yellow)',
    completed: 'var(--text-muted)',
  };
  return (
    <span
      className="chip-dot"
      style={{ background: colors[status] || 'var(--text-muted)' }}
    />
  );
}

function ExperimentSection({ title, experiments, statusColor, startIndex, dotClass }) {
  if (!experiments.length) return null;

  return (
    <section className="home-section animate-fade-in-up" style={{ animationDelay: `${0.15 + startIndex * 0.05}s` }}>
      <div className="home-section-header">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            flexShrink: 0,
          }}
          className={dotClass || ''}
        />
        <h2 className="home-section-title">{title}</h2>
        <span className="home-section-count">{experiments.length}</span>
        <span className="home-section-line" />
      </div>
      <div className="experiment-grid">
        {experiments.map((exp, i) => (
          <div
            key={exp.id}
            className={`animate-scale-in stagger-${Math.min(i + 1, 12)}`}
          >
            <ExperimentCard experiment={exp} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SortDirectionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v10" />
      <path d="M3 8l4 4 4-4" />
    </svg>
  );
}

export default function DashboardHome() {
  const { data: experiments, isLoading, error } = useExperiments();
  const homeGroupBy = useUiStore((s) => s.homeGroupBy);
  const homeSortBy = useUiStore((s) => s.homeSortBy);
  const homeSortDesc = useUiStore((s) => s.homeSortDesc);
  const setHomeGroupBy = useUiStore((s) => s.setHomeGroupBy);
  const setHomeSortBy = useUiStore((s) => s.setHomeSortBy);
  const toggleHomeSortDesc = useUiStore((s) => s.toggleHomeSortDesc);

  const { groups, stats } = useMemo(() => {
    if (!experiments) return { groups: [], stats: null };

    const sorted = sortExperiments(experiments, homeSortBy, homeSortDesc);
    const groups = groupExperiments(sorted, homeGroupBy);

    // Compute stats
    const running = experiments.filter((e) => e.status === 'running');
    const paused = experiments.filter((e) => e.status === 'paused');
    const totalPrograms = experiments.reduce((s, e) => s + (e.total_programs || 0), 0);
    const bestScore = experiments.reduce((best, e) => {
      if (e.best_score != null && (best === null || e.best_score > best)) return e.best_score;
      return best;
    }, null);

    const stats = {
      total: experiments.length,
      running: running.length,
      paused: paused.length,
      completed: experiments.length - running.length - paused.length,
      totalPrograms,
      bestScore,
    };

    return { groups, stats };
  }, [experiments, homeGroupBy, homeSortBy, homeSortDesc]);

  let sectionIndex = 0;

  return (
    <div>
      {/* Hero */}
      <div className="home-hero">
        <div className="home-dot-grid" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="home-brand animate-fade-in-up">EvoLLM</h1>
          <p className="home-subtitle animate-fade-in-up stagger-2">
            Evolutionary Code Observatory
          </p>

          {stats && stats.total > 0 && (
            <div className="home-stats-row animate-fade-in-up stagger-4">
              <div className="home-stat-chip">
                <span className="chip-value">{stats.total}</span>
                experiment{stats.total !== 1 ? 's' : ''}
              </div>
              {stats.running > 0 && (
                <div className="home-stat-chip">
                  <StatusDot status="running" />
                  <span className="chip-value">{stats.running}</span>
                  running
                </div>
              )}
              {stats.paused > 0 && (
                <div className="home-stat-chip">
                  <StatusDot status="paused" />
                  <span className="chip-value">{stats.paused}</span>
                  paused
                </div>
              )}
              <div className="home-stat-chip">
                <span className="chip-value">{fmt(stats.totalPrograms, 0)}</span>
                total programs
              </div>
              {stats.bestScore != null && (
                <div className="home-stat-chip">
                  <span className="chip-value" style={{ color: 'var(--green)' }}>
                    {fmt(stats.bestScore)}
                  </span>
                  best score
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 16px 0' }}>
        {isLoading && <LoadingSpinner text="Discovering experiments..." />}

        {error && (
          <div className="card" style={{ color: 'var(--red)', marginBottom: 16 }}>
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {experiments && experiments.length === 0 && !isLoading && (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 className="empty-state-title">No experiments found</h3>
            <p className="empty-state-text">
              Place experiment data — checkpoint directories, <code style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4 }}>.sqlite</code> files,
              or framework artifacts — inside the evollm-dashboard directory, then restart the backend.
            </p>
          </div>
        )}

        {/* Controls toolbar */}
        {experiments && experiments.length > 0 && (
          <div className="home-toolbar animate-fade-in-up stagger-3">
            <span className="home-toolbar-label">Group</span>
            <select
              className="home-select"
              value={homeGroupBy}
              onChange={(e) => setHomeGroupBy(e.target.value)}
            >
              <option value="status">Status</option>
              <option value="campaign">Campaign</option>
              <option value="framework">Framework</option>
              <option value="none">None</option>
            </select>

            <span className="home-toolbar-label" style={{ marginLeft: 6 }}>Sort</span>
            <select
              className="home-select"
              value={homeSortBy}
              onChange={(e) => setHomeSortBy(e.target.value)}
            >
              <option value="last_modified">Last Modified</option>
              <option value="name">Name</option>
              <option value="best_score">Best Score</option>
              <option value="generation">Generation</option>
              <option value="programs">Programs</option>
            </select>

            <button
              className="home-sort-toggle"
              data-desc={String(homeSortDesc)}
              onClick={toggleHomeSortDesc}
              title={homeSortDesc ? 'Descending' : 'Ascending'}
            >
              <SortDirectionIcon />
            </button>
          </div>
        )}

        {/* Grouped experiment sections */}
        {groups.map((group) => {
          if (group.title === null) {
            // Flat list (no header)
            const idx = sectionIndex;
            sectionIndex += group.experiments.length;
            return (
              <section key={group.key} className="home-section animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="experiment-grid">
                  {group.experiments.map((exp, i) => (
                    <div
                      key={exp.id}
                      className={`animate-scale-in stagger-${Math.min(i + 1, 12)}`}
                    >
                      <ExperimentCard experiment={exp} />
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          const idx = sectionIndex;
          sectionIndex += 1;
          return (
            <ExperimentSection
              key={group.key}
              title={group.title}
              experiments={group.experiments}
              statusColor={group.color}
              dotClass={group.dotClass}
              startIndex={idx}
            />
          );
        })}

        {/* Quick compare link if 2+ experiments */}
        {experiments && experiments.length >= 2 && (
          <div className="animate-fade-in" style={{ animationDelay: '0.5s', textAlign: 'center', padding: '8px 0 24px' }}>
            <Link
              to="/compare"
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              Compare experiments &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
