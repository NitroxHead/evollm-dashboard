import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchMetaFiles, fetchMetaContent } from '../lib/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

function parseMetaContent(text) {
  if (!text) return { summaries: [], recommendations: [] };

  const summaries = [];
  const recommendations = [];

  // Split by ## headers
  const sections = text.split(/^(## .+)$/gm);

  let currentSection = '';
  for (let i = 0; i < sections.length; i++) {
    const part = sections[i].trim();
    if (part.startsWith('## ')) {
      currentSection = part.replace('## ', '').toLowerCase();
      continue;
    }
    if (!part) continue;

    if (currentSection.includes('recommendation') || currentSection.includes('strateg') || currentSection.includes('next') || currentSection.includes('insight')) {
      recommendations.push({ title: sections[i - 1] || 'Recommendations', content: part });
    }

    // Extract program summary blocks
    const programBlocks = part.split(/(?=\*\*Program Name:\*\*)/g);
    for (const block of programBlocks) {
      if (block.includes('**Program Name:**') || block.includes('**Program:**')) {
        summaries.push(block.trim());
      }
    }
  }

  // If no structured blocks found, try line-based extraction
  if (summaries.length === 0) {
    const lines = text.split('\n');
    let block = [];
    let inBlock = false;
    for (const line of lines) {
      if (line.match(/\*\*Program/i) || line.match(/^- \*\*/)) {
        if (block.length > 0) summaries.push(block.join('\n'));
        block = [line];
        inBlock = true;
      } else if (inBlock && line.trim() === '') {
        if (block.length > 0) summaries.push(block.join('\n'));
        block = [];
        inBlock = false;
      } else if (inBlock) {
        block.push(line);
      }
    }
    if (block.length > 0) summaries.push(block.join('\n'));
  }

  return { summaries, recommendations };
}

function renderFormatted(text) {
  if (!text) return null;

  return text.split('\n').map((line, i) => {
    // Headers
    if (line.startsWith('### ')) {
      return <h4 key={i} style={{ fontSize: '0.95rem', fontWeight: 600, margin: '8px 0 4px', color: 'var(--text-primary)' }}>{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} style={{ fontSize: '1.05rem', fontWeight: 600, margin: '12px 0 6px', color: 'var(--accent)' }}>{line.slice(3)}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h3 key={i} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '12px 0 6px', color: 'var(--text-primary)' }}>{line.slice(2)}</h3>;
    }

    // Bullet lists
    if (line.match(/^[-*] /)) {
      const content = line.slice(2);
      return (
        <div key={i} style={{ paddingLeft: 16, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{'\u2022'}</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
        </div>
      );
    }

    // Empty line
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

    // Normal text with bold
    return <div key={i} style={{ marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
  });
}

function boldify(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>');
}

const TAB_STYLE = (active) => ({
  padding: '6px 14px',
  fontSize: '0.8rem',
  border: 'none',
  cursor: 'pointer',
  background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
  color: active ? '#fff' : 'var(--text-secondary)',
  fontWeight: active ? 600 : 400,
  borderRadius: 6,
});

export default function MetaScratchpadPage() {
  const { experimentId } = useParams();
  const [files, setFiles] = useState([]);
  const [selectedGen, setSelectedGen] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('full');

  useEffect(() => {
    fetchMetaFiles(experimentId)
      .then((data) => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [experimentId]);

  useEffect(() => {
    if (selectedGen == null) return;
    setLoading(true);
    fetchMetaContent(experimentId, selectedGen)
      .then((data) => {
        setContent(data.content || '');
        setLoading(false);
      })
      .catch(() => { setContent('Failed to load.'); setLoading(false); });
  }, [experimentId, selectedGen]);

  const parsed = useMemo(() => parseMetaContent(content), [content]);

  if (loading && files.length === 0) return <LoadingSpinner text="Loading meta files..." />;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Meta Scratchpad</h2>

      {files.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          No meta files found. This feature is available for experiments with meta_N.txt files.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* File list */}
          <div style={{ width: 200, minWidth: 200 }}>
            {files.map((f) => (
              <div
                key={f.generation}
                onClick={() => setSelectedGen(f.generation)}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  marginBottom: 8,
                  padding: '8px 12px',
                  borderColor: selectedGen === f.generation ? 'var(--accent)' : undefined,
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>Generation {f.generation}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.filename}</div>
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {loading ? (
              <LoadingSpinner text="Loading..." />
            ) : content ? (
              <div>
                {/* Sub-tab buttons */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button style={TAB_STYLE(subTab === 'full')} onClick={() => setSubTab('full')}>Full Text</button>
                  <button style={TAB_STYLE(subTab === 'summaries')} onClick={() => setSubTab('summaries')}>
                    Program Summaries {parsed.summaries.length > 0 && `(${parsed.summaries.length})`}
                  </button>
                  <button style={TAB_STYLE(subTab === 'recommendations')} onClick={() => setSubTab('recommendations')}>
                    Recommendations {parsed.recommendations.length > 0 && `(${parsed.recommendations.length})`}
                  </button>
                </div>

                {subTab === 'full' && (
                  <div className="card">
                    <div style={{
                      fontSize: '0.85rem',
                      lineHeight: 1.7,
                      maxHeight: 600,
                      overflow: 'auto',
                    }}>
                      {renderFormatted(content)}
                    </div>
                  </div>
                )}

                {subTab === 'summaries' && (
                  <div>
                    {parsed.summaries.length === 0 ? (
                      <div className="card" style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
                        No program summary blocks detected in this meta file.
                      </div>
                    ) : (
                      parsed.summaries.map((s, i) => (
                        <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            {renderFormatted(s)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {subTab === 'recommendations' && (
                  <div>
                    {parsed.recommendations.length === 0 ? (
                      <div className="card" style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
                        No recommendation sections detected in this meta file.
                      </div>
                    ) : (
                      parsed.recommendations.map((r, i) => (
                        <div key={i} className="card" style={{ marginBottom: 8, padding: '12px 16px' }}>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>
                            {r.title.replace('## ', '')}
                          </h3>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            {renderFormatted(r.content)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', padding: 20 }}>
                Select a generation to view its meta synthesis.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
