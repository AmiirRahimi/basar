'use client';

import { cn } from '@/ui';
import { faNumber } from '@/lib/format';

export function NewMessageBadge({
  count,
  className,
  pulse = true,
}: {
  count: number;
  className?: string;
  pulse?: boolean;
}) {
  if (!count || count < 1) return null;
  const label = count > 99 ? '۹۹+' : faNumber(count);
  return (
    <span
      className={cn(
        'inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm shadow-rose-500/40',
        pulse && 'animate-pulse',
        className,
      )}
      aria-label={`${label} پیام خوانده‌نشده`}
    >
      {label}
    </span>
  );
}
