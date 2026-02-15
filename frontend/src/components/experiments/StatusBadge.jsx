export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function FrameworkBadge({ framework }) {
  return <span className={`badge badge-${framework}`}>{framework}</span>;
}
