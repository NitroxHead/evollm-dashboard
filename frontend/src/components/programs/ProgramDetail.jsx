import { useState } from 'react';
import CodeViewer from './CodeViewer';
import DiffViewer from './DiffViewer';
import MetricsPanel from './MetricsPanel';
import LineageBreadcrumb from './LineageBreadcrumb';
import JsonTreeViewer from '../common/JsonTreeViewer';
import { fmt, formatTimestamp, shortId } from '../../lib/utils';
import { islandColor } from '../../lib/colors';

const TABS = ['Code', 'Diff', 'Conversation', 'Artifacts', 'Metrics'];

export default function ProgramDetail({ program, experimentId }) {
  const [tab, setTab] = useState('Code');
  const p = program;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: '1rem' }}>{p.id}</h2>
        {p.in_archive && <span style={{ fontSize: '1rem' }}>{'\u2B50'}</span>}
        {p.island_id != null && (
          <span className="badge" style={{
            background: `${islandColor(p.island_id)}20`,
            color: islandColor(p.island_id),
          }}>
            Island {p.island_id}
          </span>
        )}
        <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
          Gen {p.generation}
        </span>
        <span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace' }}>
          Score: {fmt(p.score)}
        </span>
      </div>

      <LineageBreadcrumb programId={p.id} parentId={p.parent_id} experimentId={experimentId} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, margin: '16px 0', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <div><span style={{ color: 'var(--text-secondary)' }}>Correct:</span> {p.correct ? '\u2713 Yes' : '\u2717 No'}</div>
        <div><span style={{ color: 'var(--text-secondary)' }}>Complexity:</span> {fmt(p.complexity, 1)}</div>
        <div><span style={{ color: 'var(--text-secondary)' }}>Children:</span> {p.children_count}</div>
        <div><span style={{ color: 'var(--text-secondary)' }}>Time:</span> {formatTimestamp(p.timestamp)}</div>
        {p.changes_description && (
          <div><span style={{ color: 'var(--text-secondary)' }}>Changes:</span> {p.changes_description}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Code' && <CodeViewer code={p.code} language={p.language} />}

      {tab === 'Diff' && <DiffViewer original={p.code_diff} />}

      {tab === 'Conversation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {p.prompts ? (
            Object.entries(p.prompts).map(([key, val]) => (
              <div key={key} className="card">
                <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>{key}</div>
                {val?.system && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>System Prompt</div>
                    <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
                      {val.system}
                    </pre>
                  </div>
                )}
                {val?.user && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>User Prompt</div>
                    <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
                      {val.user}
                    </pre>
                  </div>
                )}
                {val?.responses?.[0] && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>LLM Response</div>
                    <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, fontSize: '0.8rem', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
                      {val.responses[0]}
                    </pre>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No conversation data stored for this program.</div>
          )}
        </div>
      )}

      {tab === 'Artifacts' && (
        <div className="card">
          {p.artifacts ? (
            <JsonTreeViewer data={p.artifacts} title="Evaluation Artifacts" />
          ) : p.text_feedback ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{p.text_feedback}</pre>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No artifacts available.</div>
          )}
        </div>
      )}

      {tab === 'Metrics' && <MetricsPanel metrics={p.metrics} />}
    </div>
  );
}
