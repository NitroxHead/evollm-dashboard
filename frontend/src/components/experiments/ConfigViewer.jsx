import JsonTreeViewer from '../common/JsonTreeViewer';

export default function ConfigViewer({ config }) {
  if (!config) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No configuration found.</div>;
  }

  if (config.raw) {
    return (
      <pre style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        fontSize: '0.8rem',
        overflow: 'auto',
        maxHeight: 600,
        color: 'var(--text-primary)',
      }}>
        {config.raw}
      </pre>
    );
  }

  return <JsonTreeViewer data={config} title="Experiment Configuration" />;
}
