'use client';

import { useEffect } from 'react';
import { AppFaultScreen } from '@/components/AppFaultScreen';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppFaultScreen
      code="خطا"
      title="این صفحه الان باز نمی‌شود"
      message="یک مشکل پیش آمد. دوباره تلاش کنید یا به صفحه اصلی برگردید."
      onRetry={reset}
    />
  );
}
