'use client';

import { useCallback } from 'react';
import { toast } from './Toast';

type ModeToastOptions = {
  id?: string;
};

type TranslateFn = (message?: string) => string;

export type UseToastOptions = {
  /** Optional i18n translator. Defaults to identity. */
  translate?: TranslateFn;
  successFallback?: string;
  errorFallback?: string;
};

/**
 * Hook used by apps / `@telc/services` API layer.
 * `toast('success' | 'error', messageKeyOrText)`.
 */
export function useToast(options: UseToastOptions = {}) {
  const {
    translate = (message?: string) => message || '',
    successFallback = 'Request Successful',
    errorFallback = 'Request Failed',
  } = options;

  const notify = useCallback(
    (toastMode: 'success' | 'error', message?: string, toastOptions?: ModeToastOptions) => {
      const translatedMessage =
        translate(message) || (toastMode === 'success' ? successFallback : errorFallback);

      if (toastMode === 'success') {
        toast.success(translatedMessage, toastOptions);
      } else {
        toast.error(translatedMessage, toastOptions);
      }
    },
    [translate, successFallback, errorFallback]
  );

  return { toast: notify };
}
