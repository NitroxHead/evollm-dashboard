import { useState } from 'react';

function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const keys = Object.keys(data[0]).filter((k) => {
    const v = data[0][k];
    return typeof v !== 'object' || v === null;
  });
  const header = keys.join(',');
  const rows = data.map((row) =>
    keys.map((k) => {
      const v = row[k];
      if (v == null) return '';
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      return String(v);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export default function ExportButton({ data, filename = 'export', label = 'Export' }) {
  const [open, setOpen] = useState(false);

  const download = (content, ext, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn" onClick={() => setOpen(!open)}>{label}</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, zIndex: 100, minWidth: 120,
        }}>
          <div
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: 4 }}
            onClick={() => download(JSON.stringify(data, null, 2), 'json', 'application/json')}
            onMouseEnter={(e) => (e.target.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
          >
            JSON
          </div>
          <div
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', borderRadius: 4 }}
            onClick={() => download(toCSV(data), 'csv', 'text/csv')}
            onMouseEnter={(e) => (e.target.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
          >
            CSV
          </div>
        </div>
      )}
    </div>
  );
}
