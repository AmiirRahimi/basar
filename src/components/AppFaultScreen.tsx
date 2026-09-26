'use client';

import { Button } from '@/ui';

export function AppFaultScreen({
  code,
  title,
  message,
  onRetry,
}: {
  code: string;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center" dir="rtl">
      <p className="text-xs tracking-[0.28em] text-gray-400">{code}</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            تلاش دوباره
          </Button>
        ) : null}
        <Button type="button" variant={onRetry ? 'outline' : 'primary'} onClick={() => { window.location.href = '/'; }}>
          صفحه اصلی
        </Button>
        <Button type="button" variant="ghost" onClick={() => { window.location.href = '/accounting'; }}>
          پنل حسابداری
        </Button>
      </div>
    </div>
  );
}
