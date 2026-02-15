import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ScoreDistribution({ scores = [] }) {
  if (scores.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No score data.</div>;
  }

  // Build histogram
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const bins = 20;
  const range = max - min || 1;
  const binSize = range / bins;

  const histogram = Array.from({ length: bins }, (_, i) => ({
    label: (min + i * binSize).toFixed(2),
    range_start: min + i * binSize,
    count: 0,
  }));

  scores.forEach((s) => {
    const idx = Math.min(Math.floor((s - min) / binSize), bins - 1);
    histogram[idx].count++;
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={histogram} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} interval="preserveStartEnd" />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
        />
        <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
