import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useConversations } from '../hooks/useMetrics';
import ConversationList from '../components/conversations/ConversationList';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ConversationsPage() {
  const { experimentId } = useParams();
  const [page, setPage] = useState(1);
  const [improvementsOnly, setImprovementsOnly] = useState(false);

  const { data, isLoading } = useConversations(experimentId, {
    page,
    page_size: 30,
    improvements_only: improvementsOnly || undefined,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Conversations</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {data ? `${data.total} total` : ''}
        </span>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={improvementsOnly} onChange={(e) => { setImprovementsOnly(e.target.checked); setPage(1); }} />
          Improvements only
        </label>
      </div>

      {isLoading && <LoadingSpinner text="Loading conversations..." />}

      {data && (
        <>
          <ConversationList conversations={data.items} experimentId={experimentId} />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {data.page} of {data.total_pages}
            </span>
            <button className="btn" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
