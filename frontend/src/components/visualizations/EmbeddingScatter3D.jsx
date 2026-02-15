import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { islandColor } from '../../lib/colors';

export default function EmbeddingScatter3D({ programs = [], onSelect }) {
  const canvasRef = useRef(null);
  const [colorMode, setColorMode] = useState('score');
  const [rotation, setRotation] = useState({ azimuth: 0.5, elevation: 0.3 });
  const [dragging, setDragging] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  const points3d = programs
    .filter((p) => p.embedding_3d && p.embedding_3d.length === 3)
    .map((p) => ({
      x: p.embedding_3d[0],
      y: p.embedding_3d[1],
      z: p.embedding_3d[2],
      id: p.id,
      score: p.score,
      island_id: p.island_id,
      generation: p.generation,
      correct: p.correct,
    }));

  const width = 600;
  const height = 500;

  const project = useCallback((px, py, pz, az, el) => {
    // Rotate around Y axis (azimuth)
    const cosA = Math.cos(az);
    const sinA = Math.sin(az);
    const rx = px * cosA - pz * sinA;
    const rz = px * sinA + pz * cosA;
    // Rotate around X axis (elevation)
    const cosE = Math.cos(el);
    const sinE = Math.sin(el);
    const ry = py * cosE - rz * sinE;
    const rz2 = py * sinE + rz * cosE;

    // Perspective projection
    const fov = 3;
    const scale = fov / (fov + rz2 + 2);
    return {
      sx: width / 2 + rx * scale * 200,
      sy: height / 2 - ry * scale * 200,
      depth: rz2,
      scale,
    };
  }, [width, height]);

  const getColor = useCallback((point) => {
    switch (colorMode) {
      case 'island':
        return point.island_id != null ? islandColor(point.island_id) : '#666';
      case 'generation': {
        const maxGen = Math.max(...points3d.map((p) => p.generation), 1);
        const t = point.generation / maxGen;
        return d3.interpolateViridis(t);
      }
      case 'correct':
        return point.correct ? '#22c55e' : '#ef4444';
      case 'score':
      default: {
        const scores = points3d.map((p) => p.score);
        const minS = Math.min(...scores);
        const maxS = Math.max(...scores);
        const t = maxS > minS ? (point.score - minS) / (maxS - minS) : 0.5;
        return d3.interpolateViridis(t);
      }
    }
  }, [colorMode, points3d]);

  useEffect(() => {
    if (points3d.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(pixelRatio, pixelRatio);

    // Normalize points to [-1, 1]
    const xs = points3d.map((p) => p.x);
    const ys = points3d.map((p) => p.y);
    const zs = points3d.map((p) => p.z);
    const rangeX = Math.max(...xs) - Math.min(...xs) || 1;
    const rangeY = Math.max(...ys) - Math.min(...ys) || 1;
    const rangeZ = Math.max(...zs) - Math.min(...zs) || 1;
    const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
    const midZ = (Math.max(...zs) + Math.min(...zs)) / 2;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    const projected = points3d.map((p, i) => {
      const nx = (p.x - midX) / maxRange * 2;
      const ny = (p.y - midY) / maxRange * 2;
      const nz = (p.z - midZ) / maxRange * 2;
      const proj = project(nx, ny, nz, rotation.azimuth, rotation.elevation);
      return { ...proj, idx: i, color: getColor(p) };
    });

    // Sort by depth (painter's algorithm)
    projected.sort((a, b) => a.depth - b.depth);

    // Clear
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, width, height);

    // Draw points
    for (const pt of projected) {
      const r = Math.max(2, 4 * pt.scale);
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, pt.idx === hoveredIdx ? r + 2 : r, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.idx === hoveredIdx ? 1 : 0.7;
      ctx.fill();
      if (pt.idx === hoveredIdx) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Draw axes
    const axes = [
      { label: 'X', dir: [1, 0, 0], color: '#ef4444' },
      { label: 'Y', dir: [0, 1, 0], color: '#22c55e' },
      { label: 'Z', dir: [0, 0, 1], color: '#3b82f6' },
    ];
    const origin = project(0, 0, 0, rotation.azimuth, rotation.elevation);
    for (const axis of axes) {
      const end = project(axis.dir[0] * 0.5, axis.dir[1] * 0.5, axis.dir[2] * 0.5, rotation.azimuth, rotation.elevation);
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(end.sx, end.sy);
      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = axis.color;
      ctx.font = '10px monospace';
      ctx.fillText(axis.label, end.sx + 3, end.sy - 3);
    }
    ctx.globalAlpha = 1;
  }, [points3d, rotation, colorMode, hoveredIdx, project, getColor]);

  const handleMouseDown = useCallback((e) => {
    setDragging({ x: e.clientX, y: e.clientY, az: rotation.azimuth, el: rotation.elevation });
  }, [rotation]);

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const dx = (e.clientX - dragging.x) * 0.01;
      const dy = (e.clientY - dragging.y) * 0.01;
      setRotation({
        azimuth: dragging.az + dx,
        elevation: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragging.el + dy)),
      });
    } else {
      // Hover detection
      if (points3d.length === 0) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const xs = points3d.map((p) => p.x);
      const ys = points3d.map((p) => p.y);
      const zs = points3d.map((p) => p.z);
      const rangeX = Math.max(...xs) - Math.min(...xs) || 1;
      const rangeY = Math.max(...ys) - Math.min(...ys) || 1;
      const rangeZ = Math.max(...zs) - Math.min(...zs) || 1;
      const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
      const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
      const midZ = (Math.max(...zs) + Math.min(...zs)) / 2;
      const maxRange = Math.max(rangeX, rangeY, rangeZ);

      let closest = -1;
      let closestDist = 15;
      points3d.forEach((p, i) => {
        const nx = (p.x - midX) / maxRange * 2;
        const ny = (p.y - midY) / maxRange * 2;
        const nz = (p.z - midZ) / maxRange * 2;
        const proj = project(nx, ny, nz, rotation.azimuth, rotation.elevation);
        const dist = Math.sqrt((proj.sx - mx) ** 2 + (proj.sy - my) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setHoveredIdx(closest);
    }
  }, [dragging, points3d, rotation, project]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleClick = useCallback((e) => {
    if (hoveredIdx >= 0 && onSelect) {
      onSelect(points3d[hoveredIdx].id);
    }
  }, [hoveredIdx, onSelect, points3d]);

  if (points3d.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
        No 3D embedding data available. Programs need embedding_pca_3d data.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', fontSize: '0.85rem' }}>
        <label style={{ color: 'var(--text-secondary)' }}>
          Color:{' '}
          <select className="input" value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
            <option value="score">Score</option>
            <option value="island">Island</option>
            <option value="generation">Generation</option>
            <option value="correct">Correct</option>
          </select>
        </label>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {points3d.length} programs | Drag to rotate
        </span>
        {hoveredIdx >= 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            {points3d[hoveredIdx].id.slice(0, 12)} | score: {points3d[hoveredIdx].score.toFixed(4)}
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{
          cursor: dragging ? 'grabbing' : hoveredIdx >= 0 ? 'pointer' : 'grab',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}
