export default function LoadingSpinner({ size = 24, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{text}</span>}
    </div>
  );
}
