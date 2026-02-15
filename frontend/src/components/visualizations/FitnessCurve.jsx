import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, islandColor } from '../../lib/colors';

export default function FitnessCurve({ bestHistory = [], meanHistory = [], perIslandBest = {} }) {
  // Merge all data by generation
  const genMap = {};
  bestHistory.forEach((pt) => {
    genMap[pt.generation] = genMap[pt.generation] || { generation: pt.generation };
    genMap[pt.generation].best = pt.value;
  });
  meanHistory.forEach((pt) => {
    genMap[pt.generation] = genMap[pt.generation] || { generation: pt.generation };
    genMap[pt.generation].mean = pt.value;
  });
  Object.entries(perIslandBest).forEach(([islandId, pts]) => {
    pts.forEach((pt) => {
      genMap[pt.generation] = genMap[pt.generation] || { generation: pt.generation };
      genMap[pt.generation][`island_${islandId}`] = pt.value;
    });
  });

  const data = Object.values(genMap).sort((a, b) => a.generation - b.generation);
  const islandIds = Object.keys(perIslandBest);

  if (data.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No fitness data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="generation" stroke="var(--text-muted)" fontSize={12} />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
          labelStyle={{ color: 'var(--text-primary)' }}
        />
        <Legend />
        <Line type="monotone" dataKey="best" stroke={CHART_COLORS.best} strokeWidth={2} dot={false} name="Best" />
        <Line type="monotone" dataKey="mean" stroke={CHART_COLORS.mean} strokeWidth={1.5} dot={false} name="Mean" strokeDasharray="5 5" />
        {islandIds.map((id) => (
          <Line
            key={id}
            type="monotone"
            dataKey={`island_${id}`}
            stroke={islandColor(Number(id))}
            strokeWidth={1}
            dot={false}
            name={`Island ${id}`}
            strokeOpacity={0.6}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
