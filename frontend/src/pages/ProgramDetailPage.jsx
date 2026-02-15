import { useParams, Link } from 'react-router-dom';
import { useProgram } from '../hooks/usePrograms';
import ProgramDetail from '../components/programs/ProgramDetail';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProgramDetailPage() {
  const { experimentId, programId } = useParams();
  const { data: program, isLoading, error } = useProgram(experimentId, programId);

  if (isLoading) return <LoadingSpinner text="Loading program..." />;
  if (error) return <div className="card" style={{ color: 'var(--red)' }}>Error: {error.message}</div>;
  if (!program) return <div style={{ color: 'var(--text-muted)' }}>Program not found.</div>;

  return (
    <div>
      <Link
        to={`/experiment/${experimentId}/programs`}
        style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-block', marginBottom: 12 }}
      >
        {'\u2190'} Back to Programs
      </Link>
      <ProgramDetail program={program} experimentId={experimentId} />
    </div>
  );
}
