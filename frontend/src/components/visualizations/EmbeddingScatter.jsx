import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { scoreToColor, islandColor } from '../../lib/colors';

export default function EmbeddingScatter({ programs = [], onSelect }) {
  const svgRef = useRef(null);
  const [colorBy, setColorBy] = useState('score');

  useEffect(() => {
    const withEmbeddings = programs.filter((p) => p.embedding_2d && p.embedding_2d.length >= 2);
    if (withEmbeddings.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 700;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const xs = withEmbeddings.map((p) => p.embedding_2d[0]);
    const ys = withEmbeddings.map((p) => p.embedding_2d[1]);
    const scores = withEmbeddings.map((p) => p.score);

    const xScale = d3.scaleLinear()
      .domain([d3.min(xs) - 0.5, d3.max(xs) + 0.5])
      .range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear()
      .domain([d3.min(ys) - 0.5, d3.max(ys) + 0.5])
      .range([height - margin.bottom, margin.top]);

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const minScore = d3.min(scores);
    const maxScore = d3.max(scores);

    // Draw parent->child lines
    const idMap = {};
    withEmbeddings.forEach((p) => { idMap[p.id] = p; });

    g.selectAll('.trajectory')
      .data(withEmbeddings.filter((p) => p.parent_id && idMap[p.parent_id]))
      .join('line')
      .attr('x1', (d) => xScale(idMap[d.parent_id].embedding_2d[0]))
      .attr('y1', (d) => yScale(idMap[d.parent_id].embedding_2d[1]))
      .attr('x2', (d) => xScale(d.embedding_2d[0]))
      .attr('y2', (d) => yScale(d.embedding_2d[1]))
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 0.5);

    // Draw points
    g.selectAll('circle')
      .data(withEmbeddings)
      .join('circle')
      .attr('cx', (d) => xScale(d.embedding_2d[0]))
      .attr('cy', (d) => yScale(d.embedding_2d[1]))
      .attr('r', 4)
      .attr('fill', (d) => {
        if (colorBy === 'island' && d.island_id != null) return islandColor(d.island_id);
        if (colorBy === 'generation') return d3.interpolateViridis(d.generation / (d3.max(withEmbeddings, (p) => p.generation) || 1));
        if (colorBy === 'correct') return d.correct ? 'var(--green)' : 'var(--red)';
        return scoreToColor(d.score, minScore, maxScore);
      })
      .attr('fill-opacity', 0.7)
      .attr('stroke', 'none')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onSelect) onSelect(d.id);
      })
      .append('title')
      .text((d) => `ID: ${d.id}\nScore: ${d.score.toFixed(4)}\nGen: ${d.generation}\nIsland: ${d.island_id ?? 'N/A'}`);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .attr('color', 'var(--text-muted)')
      .attr('font-size', 10);

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(6))
      .attr('color', 'var(--text-muted)')
      .attr('font-size', 10);

  }, [programs, colorBy, onSelect]);

  const hasEmbeddings = programs.some((p) => p.embedding_2d && p.embedding_2d.length >= 2);
  if (!hasEmbeddings) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No embedding data available.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {['score', 'island', 'generation', 'correct'].map((opt) => (
          <button
            key={opt}
            className="btn"
            onClick={() => setColorBy(opt)}
            style={colorBy === opt ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            {opt}
          </button>
        ))}
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 500 }} />
      </div>
    </div>
  );
}
