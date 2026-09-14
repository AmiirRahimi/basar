'use client';

import { useCallback, useRef, useState } from 'react';
import useApiMethods from './useApiMethods';
import { useToast } from './useToast';
import { getApiBaseUrl } from '../config';
import type { HttpResponse } from '../types';

const API_ERROR_TOAST_ID = 'api-request-error';

export interface ApiRequestConfig {
  url?: string;
  method?: string;
  apiType?: string;
  extraHeaders?: object;
  /** Disable success/error toasts */
  silent?: boolean;
  translate?: (message?: string) => string;
}

export interface RequestType {
  body?: object;
  requiredSchema?: string[];
  pathParams?: string[];
  queryParams?: Record<string, string>;
  headers?: HeadersInit | undefined;
  method?: string;
  apiType?: string;
  url?: string;
  baseUrl?: string;
}

export function useApiRequest({
  url = '/',
  method = 'GET',
  apiType = 'api',
  extraHeaders,
  silent = false,
  translate,
}: ApiRequestConfig = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<unknown>(null);
  const { requestNoCache, requestCached } = useApiMethods();
  const { toast } = useToast({ translate });
  const extraHeadersRef = useRef(extraHeaders);
  extraHeadersRef.current = extraHeaders;

  const buildUrl = useCallback(
    (
      requestUrl: string,
      pathParams: string[] = [],
      queryParams: Record<string, string> = {},
      baseUrl?: string
    ) => {
      const localBaseUrl = (baseUrl || getApiBaseUrl()).replace(/\/+$/, '');
      const normalizedUrl = requestUrl.replace(/^\/+/, '');
      let finalUrl = `${localBaseUrl}/${normalizedUrl}`;
      if (pathParams.length > 0) {
        pathParams.forEach((i) => {
          finalUrl = `${finalUrl}/${i}`;
        });
      }
      if (Object.keys(queryParams).length > 0) {
        finalUrl = `${finalUrl}?${new URLSearchParams(queryParams).toString()}`;
      }
      return finalUrl;
    },
    []
  );

  const request = useCallback(
    async <T = any, Paginated extends boolean = false>(
      options: RequestType = {}
    ): Promise<HttpResponse<T, Paginated>> => {
      const {
        body = {},
        pathParams = [],
        queryParams = {},
        method: requestMethod = method,
        apiType: requestApiType = apiType,
        url: requestUrl = url || '',
        baseUrl,
      } = options;

      setLoading(true);
      setError(null);

      try {
        const finalUrl = buildUrl(requestUrl, pathParams, queryParams, baseUrl);
        const customHeaders: Record<string, string> = {
          ...((extraHeadersRef.current as Record<string, string>) || {}),
        };
        const headers =
          Object.keys(customHeaders).length > 0 ? (customHeaders as HeadersInit) : undefined;

        const upperMethod = requestMethod.toUpperCase();
        const executor =
          requestApiType.toLowerCase() === 'cache'
            ? (args: any, opts: any) => requestCached(args, opts)
            : (args: any) => requestNoCache(args);

        const requestInfo = {
          url: finalUrl,
          method: upperMethod,
          headers,
          body: body ?? undefined,
          pathParams,
        };

        const response = await executor(requestInfo, {
          queryKey: [upperMethod, finalUrl, body ? JSON.stringify(body) : JSON.stringify({})],
        });

        if (!response.status || response.status === 'SUCCEEDED') {
          if (
            !silent &&
            upperMethod !== 'GET' &&
            !finalUrl.includes('page-query') &&
            !finalUrl.includes('by-ivr')
          ) {
            toast('success', 'SuccessRequest');
          }
          if (body) {
            response.data = body;
          }
          setData(requestInfo);
        } else if (!silent) {
          toast('error', response.error?.message || 'ErrorInRequest', { id: API_ERROR_TOAST_ID });
        }
        return response as HttpResponse<T, Paginated>;
      } catch (err: any) {
        if (!silent) toast('error', 'ErrorInRequest', { id: API_ERROR_TOAST_ID });
        setError(err);
        return err;
      } finally {
        setLoading(false);
      }
    },
    [url, method, apiType, buildUrl, requestCached, requestNoCache, toast, silent]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { request, loading, error, data, reset };
}

export default useApiRequest;
