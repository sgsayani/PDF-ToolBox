import { useQuery } from '@tanstack/react-query';

import { pdfApi } from '../services/pdfApi';

/** Used until the server reports its own configuration. */
const FALLBACK_LIMITS = {
  maxFileSizeMb: 50,
  maxFilesPerRequest: 20,
  fileTtlMinutes: 60,
};

/**
 * Reads upload limits from the server so client-side validation always matches
 * what the backend will actually accept, rather than duplicating constants.
 */
export function useLimits() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => pdfApi.health(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const limits = data?.limits ?? FALLBACK_LIMITS;

  return {
    ...limits,
    maxFileSizeBytes: limits.maxFileSizeMb * 1024 * 1024,
  };
}
