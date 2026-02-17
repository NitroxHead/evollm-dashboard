import { useState, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useExperiments } from '../../hooks/useExperiments';
import { useWebSocketStore } from '../../stores/websocketStore';
import { useUiStore } from '../../stores/uiStore';
import { sortExperiments, groupExperiments } from '../../lib/experiments';

// Inline SVG icons (14x14, stroke-based)
const Icons = {
  overview: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  ),
  programs: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M5 3 2 8l3 5M11 3l3 5-3 5M9.5 2l-3 12" />
    </svg>
  ),
  genealogy: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="2.5" r="1.5" />
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="12" cy="10" r="1.5" />
      <path d="M8 4v2.5M8 6.5 4 8.5M8 6.5l4 2" />
      <circle cx="4" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <path d="M4 11.5v1.5M12 11.5v1.5" />
    </svg>
  ),
  islands: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="4.5" cy="5" r="2.5" />
      <circle cx="11.5" cy="5" r="2.5" />
      <circle cx="8" cy="12" r="2.5" />
      <path d="M6.5 6.2 8 9.5M9.5 6.2 8 9.5" opacity="0.4" />
    </svg>
  ),
  conversations: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h12v7H6l-3 2.5V10H2z" />
      <path d="M5 6h6M5 8h4" opacity="0.5" />
    </svg>
  ),
  metrics: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14h12" />
      <path d="M3 14V8M6 14V5M9 14V7M12 14V3" />
    </svg>
  ),
  embedding: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="7" cy="11" r="1.5" />
      <circle cx="12.5" cy="10" r="1.5" />
      <circle cx="3" cy="13" r="1" opacity="0.4" />
      <circle cx="13" cy="6.5" r="1" opacity="0.4" />
    </svg>
  ),
  meta: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h6l3 3v9H4z" />
      <path d="M10 2v3h3" />
      <path d="M6 8h5M6 10.5h3" opacity="0.5" />
    </svg>
  ),
  analytics: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 5.5 7l3 3L14 4" />
      <path d="M10 4h4v4" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { label: 'Overview', path: '', key: '1', icon: 'overview' },
  { label: 'Programs', path: '/programs', key: '2', icon: 'programs' },
  { label: 'Genealogy', path: '/genealogy', key: '3', icon: 'genealogy' },
  { label: 'Islands', path: '/islands', key: '4', icon: 'islands' },
  { label: 'Conversations', path: '/conversations', key: '5', icon: 'conversations' },
  { label: 'Metrics', path: '/metrics', key: '6', icon: 'metrics' },
  { label: 'Embedding', path: '/embedding', key: '7', icon: 'embedding' },
  { label: 'Meta', path: '/meta', key: '8', icon: 'meta' },
  { label: 'Analytics', path: '/analytics', key: '9', icon: 'analytics' },
];

const GROUP_LABELS = {
  status: 'Status',
  campaign: 'Campaign',
  framework: 'Framework',
  none: 'None',
};

const SORT_LABELS = {
  last_modified: 'Modified',
  name: 'Name',
  best_score: 'Score',
  generation: 'Gen',
  programs: 'Programs',
};

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <path d="m11 11 3.5 3.5" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.15s ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        opacity: 0.5,
        flexShrink: 0,
      }}
    >
      <path d="M3.5 2 7 5 3.5 8" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M2 3h8M3 6h6M4 9h4" />
    </svg>
  );
}

function SidebarGroup({ group, experimentId, location, unreadCounts, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  if (group.experiments.length === 0) return null;

  // For "none" grouping, render flat list without header
  if (group.title === null) {
    return (
      <div className="sidebar-group">
        <div className="sidebar-group-items">
          {group.experiments.map((exp) => (
            <ExperimentItem
              key={exp.id}
              exp={exp}
              experimentId={experimentId}
              location={location}
              unreadCounts={unreadCounts}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-group">
      <button
        className="sidebar-group-header"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`sidebar-group-dot${group.dotClass ? ` ${group.dotClass}` : ''}`}
          style={{ background: group.color }}
        />
        <span className="sidebar-group-label">{group.title}</span>
        <span className="sidebar-group-count">{group.experiments.length}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="sidebar-group-items">
          {group.experiments.map((exp) => (
            <ExperimentItem
              key={exp.id}
              exp={exp}
              experimentId={experimentId}
              location={location}
              unreadCounts={unreadCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentItem({ exp, experimentId, location, unreadCounts }) {
  const isActive = experimentId === exp.id;
  const unread = unreadCounts[exp.id] || 0;

  return (
    <div>
      <Link
        to={`/experiment/${exp.id}`}
        className="sidebar-exp-link"
        data-active={isActive}
        title={exp.name}
      >
        <span className="sidebar-exp-name">{exp.name}</span>
        {unread > 0 && <span className="sidebar-unread">{unread}</span>}
      </Link>

      {isActive && (
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const fullPath = `/experiment/${exp.id}${item.path}`;
            const isCurrent = location.pathname === fullPath;
            return (
              <Link
                key={item.path}
                to={fullPath}
                className="sidebar-nav-item"
                data-current={isCurrent}
              >
                {Icons[item.icon]}
                <span>{item.label}</span>
                <span className="sidebar-nav-key">{item.key}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { data: experiments = [] } = useExperiments();
  const location = useLocation();
  const { experimentId } = useParams();
  const unreadCounts = useWebSocketStore((s) => s.unreadCounts);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const homeGroupBy = useUiStore((s) => s.homeGroupBy);
  const homeSortBy = useUiStore((s) => s.homeSortBy);
  const homeSortDesc = useUiStore((s) => s.homeSortDesc);
  const setHomeGroupBy = useUiStore((s) => s.setHomeGroupBy);
  const setHomeSortBy = useUiStore((s) => s.setHomeSortBy);
  const toggleHomeSortDesc = useUiStore((s) => s.toggleHomeSortDesc);
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const filtered = q
      ? experiments.filter((e) => e.name.toLowerCase().includes(q))
      : experiments;

    const sorted = sortExperiments(filtered, homeSortBy, homeSortDesc);
    return groupExperiments(sorted, homeGroupBy);
  }, [experiments, filter, homeGroupBy, homeSortBy, homeSortDesc]);

  const totalFiltered = useMemo(
    () => groups.reduce((sum, g) => sum + g.experiments.length, 0),
    [groups]
  );

  if (!sidebarOpen) return null;

  return (
    <aside className="app-sidebar">
      {/* Search */}
      {experiments.length > 3 && (
        <div className="sidebar-search">
          <SearchIcon />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Filter experiments..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button
              className="sidebar-search-clear"
              onClick={() => setFilter('')}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* Sort/Group controls */}
      {experiments.length > 1 && (
        <div className="sidebar-controls">
          <div className="sidebar-control-row">
            <SortIcon />
            <select
              className="sidebar-control-select"
              value={homeGroupBy}
              onChange={(e) => setHomeGroupBy(e.target.value)}
              title="Group by"
            >
              <option value="status">Status</option>
              <option value="campaign">Campaign</option>
              <option value="framework">Framework</option>
              <option value="none">None</option>
            </select>
            <span className="sidebar-control-sep">/</span>
            <select
              className="sidebar-control-select"
              value={homeSortBy}
              onChange={(e) => setHomeSortBy(e.target.value)}
              title="Sort by"
            >
              <option value="last_modified">Modified</option>
              <option value="name">Name</option>
              <option value="best_score">Score</option>
              <option value="generation">Gen</option>
              <option value="programs">Programs</option>
            </select>
            <button
              className="sidebar-sort-dir"
              onClick={toggleHomeSortDesc}
              title={homeSortDesc ? 'Descending' : 'Ascending'}
              data-desc={String(homeSortDesc)}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 1.5v7" />
                <path d="M2.5 6 5 8.5 7.5 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Experiment groups */}
      <div className="sidebar-experiments">
        {groups.map((group, i) => (
          <SidebarGroup
            key={group.key}
            group={group}
            experimentId={experimentId}
            location={location}
            unreadCounts={unreadCounts}
            defaultOpen={i < 3}
          />
        ))}

        {totalFiltered === 0 && experiments.length > 0 && (
          <div className="sidebar-no-results">
            No matches for &ldquo;{filter}&rdquo;
          </div>
        )}

        {experiments.length === 0 && (
          <div className="sidebar-no-results">
            No experiments found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <span className="sidebar-footer-text">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
        </span>
      </div>
    </aside>
  );
}
