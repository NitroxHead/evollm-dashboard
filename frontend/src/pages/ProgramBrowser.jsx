import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePrograms, useSearchPrograms } from '../hooks/usePrograms';
import ProgramTable from '../components/programs/ProgramTable';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ExportButton from '../components/common/ExportButton';
import { shortId, fmt } from '../lib/utils';
import { scoreToColor } from '../lib/colors';

export default function ProgramBrowser() {
  const { experimentId } = useParams();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('generation');
  const [sortDesc, setSortDesc] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const params = {
    page,
    page_size: 50,
    sort_by: sortBy,
    sort_desc: sortDesc,
    ...filters,
  };

  const { data, isLoading } = usePrograms(experimentId, params);
  const { data: searchResults, isLoading: searching } = useSearchPrograms(experimentId, searchQuery);

  const handleSort = (col, desc) => {
    setSortBy(col);
    setSortDesc(desc);
    setPage(1);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Programs</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {data ? `${data.total} total` : ''}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" onChange={(e) => setFilters({ ...filters, archive_only: e.target.checked || undefined })} />
            Archive only
          </label>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" onChange={(e) => setFilters({ ...filters, correct_only: e.target.checked || undefined })} />
            Correct only
          </label>
          <select
            className="input"
            style={{ width: 100 }}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ ...filters, island_id: v === '' ? undefined : Number(v) });
              setPage(1);
            }}
          >
            <option value="">All islands</option>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <option key={i} value={i}>Island {i}</option>
            ))}
          </select>
          {data?.items && <ExportButton data={data.items} filename="programs" />}
        </div>
      </div>

      {/* Code search */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar
          placeholder="Search across all program code..."
          onSearch={(q) => setSearchQuery(q)}
        />
      </div>

      {/* Search results */}
      {searchQuery && (
        <div style={{ marginBottom: 16 }}>
          {searching && <LoadingSpinner text="Searching..." />}
          {searchResults && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                {searchResults.total} results for "{searchResults.query}"
              </div>
              {searchResults.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {searchResults.items.slice(0, 20).map((p) => (
                    <Link
                      key={p.id}
                      to={`/experiment/${experimentId}/programs/${p.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '6px 8px', borderRadius: 6, textDecoration: 'none',
                        color: 'var(--text-primary)', fontSize: '0.85rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{shortId(p.id)}</span>
                      <span style={{ color: scoreToColor(p.score, 0, Math.max(...searchResults.items.map((x) => x.score))), fontWeight: 600 }}>
                        {fmt(p.score)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Gen {p.generation} | {p.changes_description || 'No description'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>No matches found.</div>
              )}
              {searchQuery && (
                <button className="btn" style={{ marginTop: 8 }} onClick={() => setSearchQuery('')}>
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading && <LoadingSpinner text="Loading programs..." />}

      {data && !searchQuery && (
        <>
          <ProgramTable
            programs={data.items}
            experimentId={experimentId}
            sortBy={sortBy}
            sortDesc={sortDesc}
            onSort={handleSort}
            scores={data.items.map((p) => p.score)}
          />

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Prev
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {data.page} of {data.total_pages}
            </span>
            <button className="btn" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
