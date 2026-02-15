import { Outlet, useParams } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useExperiment } from '../../hooks/useExperiments';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useUiStore } from '../../stores/uiStore';

export default function MainLayout() {
  const { experimentId } = useParams();
  const { data: experiment } = useExperiment(experimentId);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  // Connect WebSocket
  useWebSocket(experimentId);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header experiment={experiment} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
