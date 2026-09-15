'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/ui';

/** Surfaces a server action's message as a toast instead of rendering it into the page body. */
export function ResultToast({
  message,
  variant = 'error',
}: {
  message?: string;
  variant?: 'error' | 'success' | 'info';
}) {
  const shown = useRef('');

  useEffect(() => {
    const text = (message || '').trim();
    if (!text || shown.current === text) return;
    shown.current = text;
    if (variant === 'success') toast.success(text);
    else if (variant === 'info') toast.info(text);
    else toast.error(text);
  }, [message, variant]);

  return null;
}
