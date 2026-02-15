import { useQuery } from '@tanstack/react-query';
import { fetchExperiments, fetchExperiment } from '../lib/api';
import { useRefreshInterval } from './useRefreshInterval';

export function useExperiments() {
  const interval = useRefreshInterval(15000);
  return useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const data = await fetchExperiments();
      return data.experiments;
    },
    refetchInterval: interval,
  });
}

export function useExperiment(id) {
  const interval = useRefreshInterval(10000);
  return useQuery({
    queryKey: ['experiment', id],
    queryFn: async () => {
      const data = await fetchExperiment(id);
      return data.experiment;
    },
    enabled: !!id,
    refetchInterval: interval,
  });
}
