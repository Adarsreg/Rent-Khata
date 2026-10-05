import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeToChanges } from './client';

export type QueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

/**
 * Runs a repository function and re-runs it whenever stored data changes.
 *
 * Drizzle ships `useLiveQuery`, but it accepts only a Drizzle query *builder*.
 * Taking it would put query builders in screens — exactly the coupling
 * `src/db/repo` exists to prevent, since a cloud-backed repository returns a
 * promise, not a builder. This listens to the storage seam's change signal
 * instead and keeps repositories as plain `async` functions.
 *
 * `deps` behaves like a `useEffect` dependency array: list everything `fn`
 * closes over.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const latestRequest = useRef(0);
  const mounted = useRef(true);

  // `fn` is a fresh closure every render and is intentionally not a
  // dependency; `deps` describes what it actually reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    const request = ++latestRequest.current;

    fn()
      .then((result) => {
        // Discard a slow earlier query that resolved after a newer one,
        // which would otherwise overwrite fresh data with stale data.
        if (!mounted.current || request !== latestRequest.current) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!mounted.current || request !== latestRequest.current) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setLoading(false);
      });
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  useEffect(() => subscribeToChanges(run), [run]);

  return { data, loading, error, refetch: run };
}
