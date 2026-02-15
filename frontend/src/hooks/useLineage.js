import { useQuery } from '@tanstack/react-query';
import { fetchLineage } from '../lib/api';

export function useLineage(expId, programId) {
  return useQuery({
    queryKey: ['lineage', expId, programId],
    queryFn: async () => {
      const data = await fetchLineage(expId, programId);
      return data.tree;
    },
    enabled: !!expId,
  });
}
