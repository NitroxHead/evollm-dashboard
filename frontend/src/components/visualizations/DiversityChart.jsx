import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS } from '../../lib/colors';

export default function DiversityChart({ programs = [] }) {
  if (programs.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No data.</div>;
  }

  // Group programs by generation: count correct vs incorrect
  const genData = {};
  programs.forEach((p) => {
    const g = p.generation;
    if (!genData[g]) genData[g] = { generation: g, correct: 0, incorrect: 0, total: 0 };
    genData[g].total++;
    if (p.correct) genData[g].correct++;
    else genData[g].incorrect++;
  });

  const data = Object.values(genData).sort((a, b) => a.generation - b.generation);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="generation" stroke="var(--text-muted)" fontSize={12} />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }} />
        <Legend />
        <Area type="monotone" dataKey="correct" stackId="1" fill={CHART_COLORS.correct} stroke={CHART_COLORS.correct} fillOpacity={0.6} />
        <Area type="monotone" dataKey="incorrect" stackId="1" fill={CHART_COLORS.incorrect} stroke={CHART_COLORS.incorrect} fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
