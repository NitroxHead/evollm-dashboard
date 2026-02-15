import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fmt, shortId } from '../../lib/utils';
import { scoreToColor, islandColor } from '../../lib/colors';

export default function BestPathView({ path = [], experimentId }) {
  if (path.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No path data available.</div>;
  }

  const scores = path.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      {/* Vertical gold line */}
      <div style={{
        position: 'absolute',
        left: 15,
        top: 20,
        bottom: 20,
        width: 2,
        background: 'linear-gradient(to bottom, #eab308, #f59e0b)',
        borderRadius: 1,
      }} />

      {path.map((p, i) => {
        const prevScore = i > 0 ? path[i - 1].score : null;
        const delta = prevScore != null ? p.score - prevScore : null;
        const modelName = p.metadata?.llm_result?.model_name || p.metadata?.model_name;
        const shortModel = modelName ? modelName.split('/').pop() : null;
        const patchType = p.metadata?.patch_type;
        const apiCost = p.metadata?.api_costs;

        return <PathStep
          key={p.id}
          program={p}
          index={i}
          total={path.length}
          delta={delta}
          minScore={minScore}
          maxScore={maxScore}
          shortModel={shortModel}
          patchType={patchType}
          apiCost={apiCost}
          experimentId={experimentId}
        />;
      })}
    </div>
  );
}

function PathStep({ program: p, index, total, delta, minScore, maxScore, shortModel, patchType, apiCost, experimentId }) {
  const [expanded, setExpanded] = useState(false);
  const patchColors = { diff: '#3b82f6', full: '#22c55e', cross: '#f97316' };

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      {/* Dot on line */}
      <div style={{
        position: 'absolute',
        left: -24,
        top: 18,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: index === total - 1 ? '#eab308' : 'var(--bg-tertiary)',
        border: `2px solid ${index === total - 1 ? '#eab308' : '#f59e0b'}`,
        zIndex: 1,
      }} />

      <Link
        to={`/experiment/${experimentId}/programs/${p.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="card card-hover" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {/* Score */}
            <span style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: scoreToColor(p.score, minScore, maxScore),
            }}>
              {fmt(p.score)}
            </span>

            {/* Delta */}
            {delta != null && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'monospace',
                color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-muted)',
              }}>
                {delta > 0 ? '+' : ''}{fmt(delta)}
              </span>
            )}

            {/* Gen */}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Gen {p.generation}
            </span>

            {/* Island */}
            {p.island_id != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: islandColor(p.island_id), display: 'inline-block',
                }} />
                Island {p.island_id}
              </span>
            )}

            {/* Model */}
            {shortModel && (
              <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                {shortModel}
              </span>
            )}

            {/* Patch type */}
            {patchType && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: 4,
                background: `${patchColors[patchType] || 'var(--text-muted)'}22`,
                color: patchColors[patchType] || 'var(--text-muted)',
              }}>
                {patchType}
              </span>
            )}

            {/* Cost */}
            {apiCost != null && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ${apiCost.toFixed(4)}
              </span>
            )}

            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: 'auto' }}>
              {shortId(p.id)}
            </span>
          </div>

          {/* Description */}
          {p.changes_description && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              {p.changes_description}
            </div>
          )}

          {/* Code diff (collapsible) */}
          {p.code_diff && (
            <div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '0.7rem', padding: 0,
                }}
              >
                {expanded ? 'Hide diff' : 'Show diff'}
              </button>
              {expanded && (
                <pre style={{
                  fontSize: '0.7rem',
                  lineHeight: 1.5,
                  background: 'var(--bg-primary)',
                  padding: 8,
                  borderRadius: 6,
                  overflow: 'auto',
                  maxHeight: 200,
                  marginTop: 4,
                  whiteSpace: 'pre-wrap',
                }}>
                  {p.code_diff}
                </pre>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
