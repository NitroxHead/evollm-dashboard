import { useParams } from 'react-router-dom';
import { useIslands } from '../hooks/useMetrics';
import IslandTopology from '../components/visualizations/IslandTopology';
import MigrationTimeline from '../components/visualizations/MigrationTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function IslandsPage() {
  const { experimentId } = useParams();
  const { data, isLoading } = useIslands(experimentId);

  if (isLoading) return <LoadingSpinner text="Loading island data..." />;

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Islands & Migration</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Island Overview</h3>
        <IslandTopology islands={data?.islands || []} migrations={data?.migrations || []} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Migration Timeline</h3>
        <MigrationTimeline migrations={data?.migrations || []} />
      </div>
    </div>
  );
}
