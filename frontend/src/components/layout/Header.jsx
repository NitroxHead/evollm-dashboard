import { useWebSocketStore } from '../../stores/websocketStore';
import { useUiStore } from '../../stores/uiStore';
import { FrameworkBadge } from '../experiments/StatusBadge';

export default function Header({ experiment }) {
  const connected = useWebSocketStore((s) => s.connected);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const autoRefreshFast = useUiStore((s) => s.autoRefreshFast);
  const toggleAutoRefresh = useUiStore((s) => s.toggleAutoRefresh);

  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <button
        onClick={toggleSidebar}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: 4 }}
        title="Toggle sidebar"
      >
        {'\u2630'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>EvoLLM</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Dashboard</span>

        {experiment && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontWeight: 500 }}>{experiment.name}</span>
            <FrameworkBadge framework={experiment.framework} />
            <span className={`badge badge-${experiment.status}`}>{experiment.status}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem' }}>
        <button
          onClick={toggleAutoRefresh}
          title={autoRefreshFast ? 'Fast refresh (3s) — click to use normal' : 'Normal refresh — click for fast (3s)'}
          style={{
            background: autoRefreshFast ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: `1px solid ${autoRefreshFast ? 'var(--accent)' : 'var(--border)'}`,
            color: autoRefreshFast ? 'var(--accent)' : 'var(--text-muted)',
            borderRadius: 6,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          {autoRefreshFast ? '\u26A1 Fast' : '\u23F0 Normal'}
        </button>

        <div
          className="pulse-dot"
          style={{ background: connected ? 'var(--green)' : 'var(--red)' }}
        />
        <span style={{ color: 'var(--text-muted)' }}>
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}
