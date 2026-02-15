import Editor from '@monaco-editor/react';

export default function CodeViewer({ code, language = 'python', height = '500px' }) {
  if (!code) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No code available.</div>;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <Editor
        height={height}
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          renderWhitespace: 'none',
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
