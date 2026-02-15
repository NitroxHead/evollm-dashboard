import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardHome from './pages/DashboardHome';
import ExperimentOverview from './pages/ExperimentOverview';
import ProgramBrowser from './pages/ProgramBrowser';
import ProgramDetailPage from './pages/ProgramDetailPage';
import GenealogyPage from './pages/GenealogyPage';
import IslandsPage from './pages/IslandsPage';
import ConversationsPage from './pages/ConversationsPage';
import MetricsPage from './pages/MetricsPage';
import EmbeddingPage from './pages/EmbeddingPage';
import MetaScratchpadPage from './pages/MetaScratchpadPage';
import LLMAnalyticsPage from './pages/LLMAnalyticsPage';
import ComparisonPage from './pages/ComparisonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'compare', element: <ComparisonPage /> },
      {
        path: 'experiment/:experimentId',
        children: [
          { index: true, element: <ExperimentOverview /> },
          { path: 'programs', element: <ProgramBrowser /> },
          { path: 'programs/:programId', element: <ProgramDetailPage /> },
          { path: 'genealogy', element: <GenealogyPage /> },
          { path: 'islands', element: <IslandsPage /> },
          { path: 'conversations', element: <ConversationsPage /> },
          { path: 'metrics', element: <MetricsPage /> },
          { path: 'embedding', element: <EmbeddingPage /> },
          { path: 'meta', element: <MetaScratchpadPage /> },
          { path: 'analytics', element: <LLMAnalyticsPage /> },
        ],
      },
    ],
  },
]);
