'use client';

import { useEffect, useState } from 'react';
import { faNumber } from '@/lib/format';
import { cn } from '@/ui/lib/cn';

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, done: total <= 0 };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex min-w-8 flex-col items-center">
      <span className="font-mono text-sm font-semibold tabular-nums">{faNumber(value).padStart(2, '۰')}</span>
      <span className="text-[9px] tracking-wide opacity-80">{label}</span>
    </span>
  );
}

export function SaleCountdown({ endsAt, className }: { endsAt?: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [endsAt]);

  if (!endsAt) return null;
  const left = new Date(endsAt).getTime() - now;
  const time = parts(left);
  if (time.done) {
    return <span className={cn('rounded-md bg-shop-ink/80 px-2 py-1 text-[11px] text-shop-bone', className)}>حراج تمام شد</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md bg-shop-ink/85 px-2.5 py-1.5 text-shop-bone shadow-sm',
        className,
      )}
    >
      <span className="text-[10px] tracking-wide text-shop-saffron">تا پایان حراج</span>
      {time.days > 0 ? <Unit value={time.days} label="روز" /> : null}
      <Unit value={time.hours} label="ساعت" />
      <Unit value={time.minutes} label="دقیقه" />
      {time.days < 1 ? <Unit value={time.seconds} label="ثانیه" /> : null}
    </span>
  );
}
