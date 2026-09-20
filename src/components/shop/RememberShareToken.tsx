'use client';

import { useEffect } from 'react';
import { rememberShareToken } from '@/actions/shop';

export function RememberShareToken({ token }: { token: string }) {
  useEffect(() => {
    if (token) void rememberShareToken(token);
  }, [token]);
  return null;
}
