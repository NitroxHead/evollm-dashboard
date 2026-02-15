import { useState } from 'react';

function JsonNode({ name, value, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null || value === undefined) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {name && <span style={{ color: 'var(--accent)' }}>{name}: </span>}
        <span style={{ color: 'var(--text-muted)' }}>null</span>
      </div>
    );
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          onClick={() => setOpen(!open)}
          style={{ cursor: 'pointer', color: 'var(--accent)', userSelect: 'none' }}
        >
          {open ? '\u25BE' : '\u25B8'} {name || 'Object'} <span style={{ color: 'var(--text-muted)' }}>({keys.length})</span>
        </span>
        {open && keys.map((k) => <JsonNode key={k} name={k} value={value[k]} depth={depth + 1} />)}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          onClick={() => setOpen(!open)}
          style={{ cursor: 'pointer', color: 'var(--accent)', userSelect: 'none' }}
        >
          {open ? '\u25BE' : '\u25B8'} {name || 'Array'} <span style={{ color: 'var(--text-muted)' }}>[{value.length}]</span>
        </span>
        {open && value.map((item, i) => <JsonNode key={i} name={String(i)} value={item} depth={depth + 1} />)}
      </div>
    );
  }

  const color =
    typeof value === 'string' ? '#a5d6a7' :
    typeof value === 'number' ? '#90caf9' :
    typeof value === 'boolean' ? '#ffab91' : 'var(--text-primary)';

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      {name && <span style={{ color: 'var(--accent)' }}>{name}: </span>}
      <span style={{ color }}>{typeof value === 'string' ? `"${value}"` : String(value)}</span>
    </div>
  );
}

export default function JsonTreeViewer({ data, title }) {
  if (!data) return <div style={{ color: 'var(--text-muted)' }}>No data</div>;
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6 }}>
      {title && <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>{title}</div>}
      <JsonNode value={data} depth={0} />
    </div>
  );
}
