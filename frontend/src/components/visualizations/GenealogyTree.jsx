import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { scoreToColor, islandColor } from '../../lib/colors';

export default function GenealogyTree({ tree, onNodeClick, colorBy = 'score' }) {
  const svgRef = useRef(null);
  const [showGoldenPath, setShowGoldenPath] = useState(true);

  useEffect(() => {
    if (!tree || !tree.nodes || Object.keys(tree.nodes).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 600;

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const nodes = Object.values(tree.nodes);
    const scores = nodes.map((n) => n.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const goldenSet = new Set(tree.best_path || []);

    // Build hierarchy from root_ids
    const childMap = {};
    nodes.forEach((n) => {
      if (n.parent_id && tree.nodes[n.parent_id]) {
        if (!childMap[n.parent_id]) childMap[n.parent_id] = [];
        childMap[n.parent_id].push(n);
      }
    });

    // Create a virtual root if multiple roots
    const roots = (tree.root_ids || []).filter((id) => tree.nodes[id]);
    const virtualRoot = { id: '__root__', children: roots.map((id) => tree.nodes[id]), score: 0 };

    function buildHierarchy(node) {
      const children = childMap[node.id] || [];
      return {
        ...node,
        children: children.length > 0 ? children.map(buildHierarchy) : undefined,
      };
    }

    const hierarchyData = {
      ...virtualRoot,
      children: roots.map((id) => buildHierarchy(tree.nodes[id])),
    };

    const root = d3.hierarchy(hierarchyData);
    const treeLayout = d3.tree().nodeSize([24, 120]);
    treeLayout(root);

    // Center
    const allNodes = root.descendants();
    const xExtent = d3.extent(allNodes, (d) => d.x);
    const yExtent = d3.extent(allNodes, (d) => d.y);
    const cx = (xExtent[0] + xExtent[1]) / 2;
    const cy = (yExtent[0] + yExtent[1]) / 2;
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - cy, height / 2 - cx).scale(0.8));

    // Links
    g.selectAll('.link')
      .data(root.links().filter((l) => l.source.data.id !== '__root__'))
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (showGoldenPath && goldenSet.has(d.source.data.id) && goldenSet.has(d.target.data.id)) {
          return '#eab308';
        }
        return 'var(--border)';
      })
      .attr('stroke-width', (d) => {
        if (showGoldenPath && goldenSet.has(d.source.data.id) && goldenSet.has(d.target.data.id)) return 3;
        return 1;
      })
      .attr('stroke-opacity', 0.6)
      .attr('d', d3.linkHorizontal().x((d) => d.y).y((d) => d.x));

    // Nodes
    const nodeGroup = g.selectAll('.node')
      .data(allNodes.filter((d) => d.data.id !== '__root__'))
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onNodeClick) onNodeClick(d.data.id);
      });

    nodeGroup.append('circle')
      .attr('r', (d) => {
        const base = 4 + (d.data.score - minScore) / (maxScore - minScore || 1) * 6;
        return Math.max(3, base);
      })
      .attr('fill', (d) => {
        if (colorBy === 'island' && d.data.island_id != null) return islandColor(d.data.island_id);
        return scoreToColor(d.data.score, minScore, maxScore);
      })
      .attr('stroke', (d) => {
        if (showGoldenPath && goldenSet.has(d.data.id)) return '#eab308';
        return 'none';
      })
      .attr('stroke-width', 2);

    // Tooltips
    nodeGroup.append('title')
      .text((d) => `ID: ${d.data.id}\nScore: ${d.data.score.toFixed(4)}\nGen: ${d.data.generation}\nIsland: ${d.data.island_id ?? 'N/A'}`);

  }, [tree, showGoldenPath, colorBy, onNodeClick]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          className="btn"
          onClick={() => setShowGoldenPath(!showGoldenPath)}
          style={showGoldenPath ? { borderColor: '#eab308', color: '#eab308' } : {}}
        >
          {showGoldenPath ? '\u2605' : '\u2606'} Golden Path
        </button>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 600 }} />
      </div>
    </div>
  );
}
