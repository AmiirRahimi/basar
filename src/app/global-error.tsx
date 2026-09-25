'use client';

import { useEffect } from 'react';
import { AppFaultScreen } from '@/components/AppFaultScreen';
import './globals.css';

export default function GlobalError({
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
    <html lang="fa" dir="rtl">
      <body>
        <AppFaultScreen
          code="خطا"
          title="برنامه الان در دسترس نیست"
          message="یک مشکل جدی پیش آمد. دوباره تلاش کنید."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
