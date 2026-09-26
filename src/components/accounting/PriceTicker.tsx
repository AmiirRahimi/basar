'use client';

import { useEffect, useState } from 'react';
import type { TickerPrice } from '@/lib/market-prices';
import { faNumber } from '@/lib/format';
import { cn } from '@/ui';

export function usePriceTicker(initialItems: TickerPrice[]) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => {
    const worker = new Worker('/workers/price-ticker.js');
    worker.onmessage = (event: MessageEvent<{ items?: TickerPrice[] }>) => {
      const next = event.data?.items;
      if (!Array.isArray(next) || !next.length) return;
      setItems(next);
    };
    return () => worker.terminate();
  }, []);
  return items;
}

function TickerGroup({ line, hidden = false }: { line: string; hidden?: boolean }) {
  return (
    <span className="inline-flex min-w-full shrink-0 items-center" aria-hidden={hidden || undefined}>
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className="px-6 text-xs font-medium whitespace-nowrap" dir="rtl">
          {line}
        </span>
      ))}
    </span>
  );
}

export function PriceTicker({ items, variant }: { items: TickerPrice[]; variant: 'sidebar' | 'inline' }) {
  if (!items.length) return null;
  const line = items.map((item) => `${item.label} ${faNumber(item.value)} ${item.unit}`).join('   •   ');
  const seconds = Math.max(24, items.length * 10);
  return (
    <div
      className={cn(
        'pointer-events-none overflow-hidden bg-sidebar-gradient text-white shadow-lg shadow-black/10',
        variant === 'sidebar' ? 'fixed inset-x-0 top-0 z-40 hidden h-10 md:block' : 'h-10 rounded-2xl md:hidden',
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
