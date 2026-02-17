import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWebSocketStore } from '../../stores/websocketStore';
import { useUiStore } from '../../stores/uiStore';
import { useExperiments } from '../../hooks/useExperiments';
import { FrameworkBadge } from '../experiments/StatusBadge';

function SidebarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
}

const EVENT_DISPLAY = {
  new_program: { label: 'Evaluating', color: 'var(--blue)' },
  improvement: { label: 'Improved', color: 'var(--green)' },
  generation_complete: { label: 'Gen done', color: 'var(--accent)' },
  migration: { label: 'Migrating', color: 'var(--cyan)' },
  status_change: { label: 'Status \u0394', color: 'var(--yellow)' },
};

function timeSince(ts) {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 5) return 'now';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

function RunningActivity({ runningExps, events }) {
  // For each running experiment, find its most recent event
  const activities = useMemo(() => {
    return runningExps.map((exp) => {
      const latest = events.find((e) => e.experiment_id === exp.id);
      const display = latest ? EVENT_DISPLAY[latest.type] : null;
      return {
        id: exp.id,
        name: exp.name,
        gen: exp.current_generation,
        programs: exp.total_programs,
        event: latest,
        display,
      };
    });
  }, [runningExps, events]);

  if (activities.length === 0) return null;

  return (
    <div className="header-running">
      {activities.map((a) => (
        <Link
          key={a.id}
          to={`/experiment/${a.id}`}
          className="header-running-item"
          title={`${a.name} — Gen ${a.gen ?? '?'}, ${a.programs ?? 0} programs`}
        >
          <span className="header-running-dot pulse-dot" />
          <span className="header-running-name">{a.name}</span>
          {a.gen != null && (
            <span className="header-running-gen">g{a.gen}</span>
          )}
          {a.display && a.event && (
            <span
              className="header-running-event"
              style={{ color: a.display.color }}
            >
              {a.display.label}
              <span className="header-running-ago">{timeSince(a.event.timestamp)}</span>
            </span>
          )}
          {!a.display && (
            <span className="header-running-event" style={{ color: 'var(--text-muted)' }}>
              Waiting...
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function Header({ experiment }) {
  const connected = useWebSocketStore((s) => s.connected);
  const events = useWebSocketStore((s) => s.events);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const autoRefreshFast = useUiStore((s) => s.autoRefreshFast);
  const toggleAutoRefresh = useUiStore((s) => s.toggleAutoRefresh);
  const { data: experiments = [] } = useExperiments();

  const runningExps = useMemo(
    () => experiments.filter((e) => e.status === 'running'),
    [experiments]
  );

  return (
    <header className="app-header">
      <button
        onClick={toggleSidebar}
        className="header-sidebar-btn"
        title="Toggle sidebar"
      >
        <SidebarIcon />
      </button>

      <Link to="/" className="header-logo">EvoLLM</Link>

      {experiment && (
        <>
          <div className="header-divider" />
          <div className="header-breadcrumb">
            <span className="header-breadcrumb-name">{experiment.name}</span>
            <FrameworkBadge framework={experiment.framework} />
            <span className={`badge badge-${experiment.status}`}>{experiment.status}</span>
          </div>
        </>
      )}

      <div className="header-controls">
        <RunningActivity runningExps={runningExps} events={events} />

        {runningExps.length > 0 && <div className="header-divider" />}

        <Link to="/stats" className="header-toggle" title="Observatory Stats">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 14h12" />
            <path d="M3 14V8M6 14V5M9 14V7M12 14V3" />
          </svg>
          Stats
        </Link>

        <button
          onClick={toggleAutoRefresh}
          className="header-toggle"
          data-active={autoRefreshFast}
          title={autoRefreshFast ? 'Fast refresh (3s) — click for normal' : 'Normal refresh — click for fast (3s)'}
        >
          {autoRefreshFast ? '\u26A1 Fast' : '\u23F0 Normal'}
        </button>

        <div className="header-status">
          <span
            className="pulse-dot"
            style={{
              width: 6,
              height: 6,
              background: connected ? 'var(--green)' : 'var(--red)',
            }}
          />
          <span>{connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
