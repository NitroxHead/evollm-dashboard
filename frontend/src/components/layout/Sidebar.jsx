import { Link, useLocation, useParams } from 'react-router-dom';
import { useExperiments } from '../../hooks/useExperiments';
import { useWebSocketStore } from '../../stores/websocketStore';
import { useUiStore } from '../../stores/uiStore';

const NAV_ITEMS = [
  { label: 'Overview', path: '', key: '1' },
  { label: 'Programs', path: '/programs', key: '2' },
  { label: 'Genealogy', path: '/genealogy', key: '3' },
  { label: 'Islands', path: '/islands', key: '4' },
  { label: 'Conversations', path: '/conversations', key: '5' },
  { label: 'Metrics', path: '/metrics', key: '6' },
  { label: 'Embedding', path: '/embedding', key: '7' },
  { label: 'Meta', path: '/meta', key: '8' },
  { label: 'Analytics', path: '/analytics', key: '9' },
];

export default function Sidebar() {
  const { data: experiments = [] } = useExperiments();
  const location = useLocation();
  const { experimentId } = useParams();
  const unreadCounts = useWebSocketStore((s) => s.unreadCounts);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        padding: '12px 0',
      }}
    >
      <div style={{ padding: '0 12px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Experiments
      </div>

      {experiments.map((exp) => {
        const isActive = experimentId === exp.id;
        const unread = unreadCounts[exp.id] || 0;

        return (
          <div key={exp.id}>
            <Link
              to={`/experiment/${exp.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                textDecoration: 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: exp.status === 'running' ? 'var(--green)' : exp.status === 'paused' ? 'var(--yellow)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {exp.name}
              </span>
              {unread > 0 && (
                <span style={{
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 9999,
                  padding: '0 6px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  minWidth: 18,
                  textAlign: 'center',
                }}>
                  {unread}
                </span>
              )}
            </Link>

            {isActive && (
              <div style={{ marginLeft: 20 }}>
                {NAV_ITEMS.map((item) => {
                  const fullPath = `/experiment/${exp.id}${item.path}`;
                  const isCurrent = location.pathname === fullPath;
                  return (
                    <Link
                      key={item.path}
                      to={fullPath}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 12px',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        color: isCurrent ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: isCurrent ? 500 : 400,
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.5 }}>{item.key}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {experiments.length === 0 && (
        <div style={{ padding: '20px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
          No experiments found.
          <br />
          <span style={{ fontSize: '0.7rem' }}>Place checkpoints or .sqlite files in evollm-dashboard/</span>
        </div>
      )}
    </aside>
  );
}
