import { DiffEditor } from '@monaco-editor/react';

export default function DiffViewer({ original, modified, language = 'python', height = '500px' }) {
  if (!original && !modified) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No diff available.</div>;
  }

  // If we have a unified diff string instead of two files, show as code
  if (!modified && original) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <pre style={{
          background: 'var(--bg-tertiary)',
          padding: 16,
          margin: 0,
          fontSize: '0.8rem',
          overflow: 'auto',
          maxHeight: height,
          lineHeight: 1.6,
        }}>
          {original.split('\n').map((line, i) => {
            let color = 'var(--text-primary)';
            if (line.startsWith('+')) color = 'var(--green)';
            else if (line.startsWith('-')) color = 'var(--red)';
            else if (line.startsWith('@')) color = 'var(--blue)';
            return <div key={i} style={{ color }}>{line}</div>;
          })}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <DiffEditor
        height={height}
        language={language}
        original={original || ''}
        modified={modified || ''}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
