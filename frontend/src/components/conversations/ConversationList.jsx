import ConversationCard from './ConversationCard';

export default function ConversationList({ conversations, experimentId }) {
  if (!conversations || conversations.length === 0) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No conversations found.</div>;
  }

  return (
    <div>
      {conversations.map((entry, i) => (
        <ConversationCard key={`${entry.program_id}-${i}`} entry={entry} experimentId={experimentId} />
      ))}
    </div>
  );
}
