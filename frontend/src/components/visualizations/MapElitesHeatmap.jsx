import { scoreToColor } from '../../lib/colors';

export default function MapElitesHeatmap({ gridData }) {
  if (!gridData || !gridData.cells || Object.keys(gridData.cells).length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No MAP-Elites data available.</div>;
  }

  const cells = gridData.cells;
  const scores = Object.values(cells).map((c) => c.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Parse cell coordinates
  const parsedCells = Object.entries(cells).map(([key, val]) => {
    const parts = key.split('-');
    return { x: parseInt(parts[0]) || 0, y: parseInt(parts[1]) || 0, ...val };
  });

  const maxX = Math.max(...parsedCells.map((c) => c.x)) + 1;
  const maxY = Math.max(...parsedCells.map((c) => c.y)) + 1;

  const cellSize = Math.min(40, 400 / Math.max(maxX, maxY));

  // Build grid
  const grid = Array.from({ length: maxY }, () => Array(maxX).fill(null));
  parsedCells.forEach((c) => {
    if (c.y < maxY && c.x < maxX) grid[c.y][c.x] = c;
  });

  const coverage = (parsedCells.length / (maxX * maxY) * 100).toFixed(1);

  return (
    <div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        Coverage: {coverage}% ({parsedCells.length}/{maxX * maxY} cells)
      </div>
      <div style={{ display: 'inline-block', border: '1px solid var(--border)', borderRadius: 4 }}>
        {grid.map((row, y) => (
          <div key={y} style={{ display: 'flex' }}>
            {row.map((cell, x) => (
              <div
                key={x}
                title={cell ? `Score: ${cell.score.toFixed(4)}\nID: ${cell.program_id}` : 'Empty'}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: cell ? scoreToColor(cell.score, minScore, maxScore) : 'var(--bg-tertiary)',
                  border: '1px solid var(--bg-primary)',
                  cursor: cell ? 'pointer' : 'default',
                  opacity: cell ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
