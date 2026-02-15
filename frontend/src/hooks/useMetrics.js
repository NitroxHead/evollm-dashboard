import { useQuery } from '@tanstack/react-query';
import { fetchMetrics, fetchIslands, fetchConversations } from '../lib/api';
import { useRefreshInterval } from './useRefreshInterval';

export function useMetrics(expId) {
  const interval = useRefreshInterval(10000);
  return useQuery({
    queryKey: ['metrics', expId],
    queryFn: async () => {
      const data = await fetchMetrics(expId);
      return data.summary;
    },
    enabled: !!expId,
    refetchInterval: interval,
  });
}

export function useIslands(expId) {
  const interval = useRefreshInterval(15000);
  return useQuery({
    queryKey: ['islands', expId],
    queryFn: () => fetchIslands(expId),
    enabled: !!expId,
    refetchInterval: interval,
  });
}

export function useConversations(expId, params = {}) {
  const interval = useRefreshInterval(15000);
  return useQuery({
    queryKey: ['conversations', expId, params],
    queryFn: () => fetchConversations(expId, params),
    enabled: !!expId,
    refetchInterval: interval,
  });
}
