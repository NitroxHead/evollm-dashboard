import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '../lib/api';
import { useRefreshInterval } from './useRefreshInterval';

export function useAnalytics(expId) {
  const interval = useRefreshInterval(30000);
  return useQuery({
    queryKey: ['analytics', expId],
    queryFn: async () => {
      const data = await fetchAnalytics(expId);
      return data.analytics;
    },
    enabled: !!expId,
    refetchInterval: interval,
  });
}
