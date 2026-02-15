import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

export default function ParetoFront({ programs = [] }) {
  const [xMetric, setXMetric] = useState('complexity');
  const [yMetric, setYMetric] = useState('score');
  const [xDir, setXDir] = useState('higher'); // 'higher' or 'lower'
  const [yDir, setYDir] = useState('higher');

  if (programs.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No program data.</div>;
  }

  // Gather available metrics from all programs
  const allMetrics = new Set(['score', 'complexity', 'diversity', 'generation', 'children_count']);
  programs.forEach((p) => {
    if (p.metrics) Object.keys(p.metrics).forEach((k) => allMetrics.add(k));
  });
  // Add metadata-based metrics
  allMetrics.add('metadata.api_costs');
  allMetrics.add('metadata.compute_time');
  const metricsList = [...allMetrics].sort();

  const getValue = (p, key) => {
    if (key === 'score') return p.score;
    if (key === 'complexity') return p.complexity;
    if (key === 'diversity') return p.diversity;
    if (key === 'generation') return p.generation;
    if (key === 'children_count') return p.children_count;
    if (key.startsWith('metadata.')) return p.metadata?.[key.slice(9)] ?? 0;
    return p.metrics?.[key] ?? 0;
  };

  const data = programs
    .map((p) => ({
      x: getValue(p, xMetric),
      y: getValue(p, yMetric),
      id: p.id,
    }))
    .filter((d) => typeof d.x === 'number' && typeof d.y === 'number');

  // Compute Pareto front respecting direction
  const xMax = xDir === 'higher';
  const yMax = yDir === 'higher';

  const sorted = [...data].sort((a, b) => xMax ? a.x - b.x : b.x - a.x);
  const front = [];
  let bestY = yMax ? -Infinity : Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const dominated = yMax ? sorted[i].y > bestY : sorted[i].y < bestY;
    if (dominated) {
      front.push(sorted[i]);
      bestY = sorted[i].y;
    }
  }
  front.reverse();

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          X: <select className="input" style={{ marginLeft: 4 }} value={xMetric} onChange={(e) => setXMetric(e.target.value)}>
            {metricsList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" value={xDir} onChange={(e) => setXDir(e.target.value)} style={{ fontSize: '0.75rem' }}>
            <option value="higher">Higher better</option>
            <option value="lower">Lower better</option>
          </select>
        </label>
        <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          Y: <select className="input" style={{ marginLeft: 4 }} value={yMetric} onChange={(e) => setYMetric(e.target.value)}>
            {metricsList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" value={yDir} onChange={(e) => setYDir(e.target.value)} style={{ fontSize: '0.75rem' }}>
            <option value="higher">Higher better</option>
            <option value="lower">Lower better</option>
          </select>
        </label>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="x" stroke="var(--text-muted)" fontSize={12} name={xMetric} />
          <YAxis dataKey="y" stroke="var(--text-muted)" fontSize={12} name={yMetric} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }}
            formatter={(val, name) => [val?.toFixed?.(4) ?? val, name]}
          />
          <Scatter data={data} fill="var(--accent)" fillOpacity={0.5} r={3} />
          <Scatter data={front} fill="#eab308" r={5} name="Pareto Front" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
