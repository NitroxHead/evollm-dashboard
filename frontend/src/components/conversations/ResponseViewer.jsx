export default function ResponseViewer({ response }) {
  if (!response) return <div style={{ color: 'var(--text-muted)' }}>No response available.</div>;

  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>LLM Response</div>
      <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 600, whiteSpace: 'pre-wrap', margin: 0 }}>
        {response}
      </pre>
    </div>
  );
}
