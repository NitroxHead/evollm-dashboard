import { useFrameworkMeta } from '../../hooks/useFrameworks';

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function FrameworkBadge({ framework }) {
  const meta = useFrameworkMeta(framework);

  if (meta) {
    return (
      <span
        className="badge"
        style={{ color: meta.badge_color, background: meta.badge_bg }}
      >
        {meta.display_name || framework}
      </span>
    );
  }

  // Fallback for unknown frameworks
  return <span className="badge">{framework}</span>;
}
