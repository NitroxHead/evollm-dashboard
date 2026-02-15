import { useQuery } from '@tanstack/react-query';
import { fetchFrameworks } from '../lib/api';

export function useFrameworks() {
  return useQuery({
    queryKey: ['frameworks'],
    queryFn: async () => {
      const data = await fetchFrameworks();
      return data.frameworks;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Look up a single framework's metadata by name. */
export function useFrameworkMeta(frameworkName) {
  const { data: frameworks } = useFrameworks();
  if (!frameworks || !frameworkName) return null;
  return frameworks.find((f) => f.name === frameworkName) || null;
}
