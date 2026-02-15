export default function PromptViewer({ systemPrompt, userPrompt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {systemPrompt && (
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>System</div>
          <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', margin: 0 }}>
            {systemPrompt}
          </pre>
        </div>
      )}
      {userPrompt && (
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>User</div>
          <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 500, whiteSpace: 'pre-wrap', margin: 0 }}>
            {userPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}
