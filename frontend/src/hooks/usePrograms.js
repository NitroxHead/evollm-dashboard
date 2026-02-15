import { useQuery } from '@tanstack/react-query';
import { fetchPrograms, fetchProgram, searchPrograms } from '../lib/api';
import { useRefreshInterval } from './useRefreshInterval';

export function usePrograms(expId, params = {}) {
  const interval = useRefreshInterval(15000);
  return useQuery({
    queryKey: ['programs', expId, params],
    queryFn: () => fetchPrograms(expId, params),
    enabled: !!expId,
    refetchInterval: interval,
  });
}

export function useProgram(expId, progId) {
  return useQuery({
    queryKey: ['program', expId, progId],
    queryFn: async () => {
      const data = await fetchProgram(expId, progId);
      return data.program;
    },
    enabled: !!expId && !!progId,
  });
}

export function useSearchPrograms(expId, query) {
  return useQuery({
    queryKey: ['search', expId, query],
    queryFn: () => searchPrograms(expId, query),
    enabled: !!expId && !!query && query.length > 0,
  });
}
