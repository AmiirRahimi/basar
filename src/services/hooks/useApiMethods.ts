'use client';

import { useCallback, useMemo } from 'react';
import { getAccessTokenCookie } from '../auth/tokens';
import type { RequestArgs, RequestOptions } from '../types';

type QueryClientLike = {
  fetchQuery: (opts: { queryKey: any[]; queryFn: () => Promise<any> }) => Promise<any>;
};

export function createApiMethods(getQueryClient?: () => QueryClientLike | null | undefined) {
  const fetchRequest = async ({ url, method = 'GET', headers, body = {} }: RequestArgs) => {
    const init: RequestInit = { method };
    const mergedHeaders: Record<string, string> = {
      ...((headers as Record<string, string>) || {}),
    };

    try {
      const at = getAccessTokenCookie();
      if (at) {
        mergedHeaders.Authorization = `${at}`;
      }
    } catch {
      // ignore
    }

    if (body != null && method.toUpperCase() !== 'GET') {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/json';
      }
    }

    if (Object.keys(mergedHeaders).length > 0) {
      init.headers = mergedHeaders;
    }

    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
  };

  const requestNoCache = async (args: RequestArgs) => fetchRequest(args);

  const requestCached = async (args: RequestArgs, options: RequestOptions = {}) => {
    const client = getQueryClient?.();
    if (!client) return fetchRequest(args);
    const m = (args.method ?? 'GET').toUpperCase();
    const key = options.queryKey || [m, args.url, args.body ? JSON.stringify(args.body) : null];
    return client.fetchQuery({
      queryKey: key,
      queryFn: () => fetchRequest(args),
    });
  };

  return { fetchRequest, requestNoCache, requestCached };
}

/** Core API methods without React Query (always available). */
export default function useApiMethods() {
  const methods = useMemo(() => createApiMethods(), []);
  const requestNoCache = useCallback(methods.requestNoCache, [methods]);
  const requestCached = useCallback(methods.requestCached, [methods]);
  return { requestNoCache, requestCached, fetchRequest: methods.fetchRequest };
}

/** Same as useApiMethods but wires React Query caching when a client is passed. */
export function useApiMethodsWithClient(queryClient: QueryClientLike | null | undefined) {
  const methods = useMemo(() => createApiMethods(() => queryClient), [queryClient]);
  const requestNoCache = useCallback(methods.requestNoCache, [methods]);
  const requestCached = useCallback(methods.requestCached, [methods]);
  return { requestNoCache, requestCached, fetchRequest: methods.fetchRequest };
}
