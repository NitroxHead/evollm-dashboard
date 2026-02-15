import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

export default function SimilarityHeatmap({ data }) {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const [sortMode, setSortMode] = useState('score'); // 'chronological', 'cluster', 'score'
  const [range, setRange] = useState([0, 1]);

  const n = data?.program_ids?.length || 0;

  const getSortedIndices = useCallback(() => {
    if (!data || n === 0) return [];
    const indices = Array.from({ length: n }, (_, i) => i);

    switch (sortMode) {
      case 'chronological':
        indices.sort((a, b) => (data.generations[a] || 0) - (data.generations[b] || 0));
        break;
      case 'cluster':
        indices.sort((a, b) => (data.cluster_ids[a] || 0) - (data.cluster_ids[b] || 0));
        break;
      case 'score':
      default:
        indices.sort((a, b) => (data.scores[b] || 0) - (data.scores[a] || 0));
        break;
    }
    return indices;
  }, [data, n, sortMode]);

  useEffect(() => {
    if (!data || n < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = Math.min(600, Math.max(300, n * 3));
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(pixelRatio, pixelRatio);

    const sorted = getSortedIndices();
    const cellSize = size / n;
    const colorScale = d3.scaleSequential(d3.interpolateMagma).domain([range[0], range[1]]);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const si = sorted[i];
        const sj = sorted[j];
        const val = data.similarity_matrix[si]?.[sj] ?? 0;
        const clamped = Math.max(range[0], Math.min(range[1], val));
        ctx.fillStyle = colorScale(clamped);
        ctx.fillRect(j * cellSize, i * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }, [data, n, sortMode, range, getSortedIndices]);

  const handleMouseMove = useCallback((e) => {
    if (!data || n < 2 || !tooltipRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const size = rect.width;
    const cellSize = size / n;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row < 0 || row >= n || col < 0 || col >= n) {
      tooltipRef.current.style.display = 'none';
      return;
    }

    const sorted = getSortedIndices();
    const si = sorted[row];
    const sj = sorted[col];
    const val = data.similarity_matrix[si]?.[sj] ?? 0;

    const tooltip = tooltipRef.current;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    tooltip.innerHTML = `
      <div style="font-size:0.7rem;font-family:monospace;">
        ${data.program_ids[si]?.slice(0, 8)} x ${data.program_ids[sj]?.slice(0, 8)}<br/>
        Similarity: <strong>${val.toFixed(4)}</strong>
      </div>
    `;
  }, [data, n, getSortedIndices]);

  const handleMouseLeave = useCallback(() => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, []);

  if (!data || n < 2) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
        No embedding data available for similarity heatmap.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', fontSize: '0.8rem', flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--text-secondary)' }}>
          Sort:{' '}
          <select className="input" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
            <option value="score">By Score</option>
            <option value="chronological">By Generation</option>
            <option value="cluster">By Cluster</option>
          </select>
        </label>
        <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          Min:
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={range[0]}
            onChange={(e) => setRange([parseFloat(e.target.value), range[1]])}
            style={{ width: 80 }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{range[0].toFixed(2)}</span>
        </label>
        <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          Max:
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={range[1]}
            onChange={(e) => setRange([range[0], parseFloat(e.target.value)])}
            style={{ width: 80 }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{range[1].toFixed(2)}</span>
        </label>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {n} x {n} programs
        </span>
      </div>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ borderRadius: 4, cursor: 'crosshair' }}
        />
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      </div>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>{range[0].toFixed(2)}</span>
        <div style={{
          width: 200, height: 12, borderRadius: 2,
          background: `linear-gradient(to right, ${d3.interpolateMagma(0)}, ${d3.interpolateMagma(0.25)}, ${d3.interpolateMagma(0.5)}, ${d3.interpolateMagma(0.75)}, ${d3.interpolateMagma(1)})`,
        }} />
        <span>{range[1].toFixed(2)}</span>
      </div>
    </div>
  );
}
