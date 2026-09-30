import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { faNumber } from '@/lib/format';
import { cn } from '@/ui';

export const INFO_TONES = ['sand', 'sage', 'mist', 'clay', 'lilac'] as const;
export type InfoTone = (typeof INFO_TONES)[number];

const TONES: Record<InfoTone, { chip: string; bar: string; wash: string }> = {
  sand: { chip: 'bg-[#f4ead7] text-[#7d6240]', bar: 'bg-[#e4d2a6]', wash: 'from-[#fbf8f2]' },
  sage: { chip: 'bg-[#e6f0ea] text-[#3e6754]', bar: 'bg-[#c5dccf]', wash: 'from-[#f4f8f6]' },
  mist: { chip: 'bg-[#e7eef6] text-[#3e5878]', bar: 'bg-[#c9d7e8]', wash: 'from-[#f5f8fb]' },
  clay: { chip: 'bg-[#f6ebe7] text-[#8a5548]', bar: 'bg-[#e7d0c8]', wash: 'from-[#fbf7f5]' },
  lilac: { chip: 'bg-[#efeaf5] text-[#5d4e76]', bar: 'bg-[#d9d0e6]', wash: 'from-[#f8f6fb]' },
};

export function InfoStat({
  label,
  value,
  hint,
  tone = 'sand',
  icon: Icon,
  href,
  selected = false,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: InfoTone;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const colors = TONES[tone];
  const shown = typeof value === 'number' ? faNumber(value) : value;
  const card = (
    <div
      className={cn(
        'relative h-full overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]',
        selected ? 'border-zinc-900 shadow-[0_8px_20px_-16px_rgba(24,24,27,0.7)]' : 'border-zinc-200/80',
      )}
    >
      <span className={cn('absolute inset-y-4 start-0 w-[3px] rounded-full', selected ? 'bg-zinc-900' : colors.bar)} aria-hidden />
      <div className={cn('flex h-full flex-col bg-gradient-to-l to-white px-4 py-4 ps-5', colors.wash)}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium leading-5 text-zinc-500">{label}</p>
          {Icon ? (
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', colors.chip)}>
              <Icon className="h-4 w-4" />
            </span>
          ) : (
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', colors.bar)} aria-hidden />
          )}
        </div>
        <p className="mt-3 text-[1.65rem] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{shown}</p>
        {hint ? <p className="mt-2 min-h-5 text-xs leading-5 text-zinc-500">{hint}</p> : <span className="mt-2 block min-h-5" />}
      </div>
    </div>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className="block h-full w-full rounded-2xl text-start outline-none transition hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        {card}
      </button>
    );
  }
  if (!href) return card;
  return (
    <Link href={href} className="block h-full rounded-2xl outline-none transition hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-zinc-400">
      {card}
    </Link>
  );
}

export function InfoStatGrid({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 3 | 4 | 5;
}) {
  const layout =
    columns === 5 ? 'sm:grid-cols-2 xl:grid-cols-5' : columns === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';
  return <div className={cn('grid gap-3', layout)}>{children}</div>;
}
