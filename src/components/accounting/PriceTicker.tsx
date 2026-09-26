'use client';

import { useEffect, useState } from 'react';
import type { TickerPrice } from '@/lib/market-prices';
import { faNumber } from '@/lib/format';
import { cn } from '@/ui';

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

export function usePriceTicker(initialItems: TickerPrice[], initialVisible = true) {
  const [items, setItems] = useState(initialItems);
  const [visible, setVisible] = useState(initialVisible);
  useEffect(() => {
    setVisible(initialVisible);
  }, [initialVisible]);
  useEffect(() => {
    const worker = new Worker('/workers/price-ticker.js');
    worker.onmessage = (event: MessageEvent<{ items?: TickerPrice[]; visible?: boolean }>) => {
      if (typeof event.data?.visible === 'boolean') setVisible(event.data.visible);
      const next = event.data?.items;
      if (!Array.isArray(next) || !next.length) return;
      setItems(next);
    };
    return () => worker.terminate();
  }, []);
  return { items, visible };
}

function TickerGroup({ line, hidden = false }: { line: string; hidden?: boolean }) {
  return (
    <span className="inline-flex min-w-full shrink-0 items-center" aria-hidden={hidden || undefined}>
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className="px-6 text-xs font-medium whitespace-nowrap text-zinc-900" dir="rtl">
          {line}
        </span>
      ))}
    </span>
  );
}

export function PriceTicker({
  items,
  variant,
  expanded = false,
}: {
  items: TickerPrice[];
  variant: 'sidebar' | 'inline';
  expanded?: boolean;
}) {
  if (!items.length) return null;
  const line = items.map((item) => `${item.label} ${faNumber(item.value)} ${item.unit}`).join('   •   ');
  const seconds = Math.max(24, items.length * 10);
  return (
    <div
      className={cn(
        'pointer-events-none overflow-hidden bg-transparent text-zinc-900',
        variant === 'sidebar'
          ? cn(
              'fixed start-5 top-5 z-40 hidden h-8 md:block',
              'transition-[width]',
              EASE,
              expanded ? 'w-[256px]' : 'w-[72px]',
            )
          : 'h-8 md:hidden',
      )}
      aria-label="قیمت‌ها"
    >
      <div className="price-ticker-track flex h-full items-center" dir="ltr" style={{ animationDuration: `${seconds}s` }}>
        <TickerGroup line={line} />
        <TickerGroup line={line} hidden />
      </div>
    </div>
  );
}
