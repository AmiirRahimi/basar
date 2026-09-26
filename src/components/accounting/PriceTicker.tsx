'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TickerPrice } from '@/lib/market-prices';
import { faNumber } from '@/lib/format';
import { cn } from '@/ui';

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';
const NORMAL_SPEED = 48;
const HOVER_SPEED = 14;

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
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const dragRef = useRef<{ x: number; offset: number } | null>(null);
  const hoverRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      const track = trackRef.current;
      if (track && !dragRef.current && !reduce) {
        const half = track.scrollWidth / 2;
        if (half > 0) {
          const speed = hoverRef.current ? HOVER_SPEED : NORMAL_SPEED;
          offsetRef.current = (offsetRef.current + (speed * dt) / 1000) % half;
          track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!items.length) return null;
  const line = items.map((item) => `${item.label} ${faNumber(item.value)} ${item.unit}`).join('   •   ');

  function moveTo(next: number) {
    const track = trackRef.current;
    const half = (track?.scrollWidth || 0) / 2;
    const wrapped = half > 0 ? ((next % half) + half) % half : 0;
    offsetRef.current = wrapped;
    if (track) track.style.transform = `translate3d(${-wrapped}px,0,0)`;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, offset: offsetRef.current };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    moveTo(drag.offset - (event.clientX - drag.x));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={cn(
        'bg-transparent text-zinc-900',
        variant === 'sidebar'
          ? cn(
              'fixed start-5 top-5 z-40 hidden md:block',
              'transition-[width]',
              EASE,
              expanded ? 'w-[256px]' : 'w-[72px]',
            )
          : 'relative md:hidden',
      )}
      onPointerEnter={() => {
        hoverRef.current = true;
        setHovered(true);
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
        setHovered(false);
      }}
    >
      <div
        className={cn(
          'h-8 touch-none overflow-hidden select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        aria-label="قیمت‌ها"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={trackRef} className="flex h-full w-max items-center" dir="ltr">
          <TickerGroup line={line} />
          <TickerGroup line={line} hidden />
        </div>
      </div>
      {hovered ? (
        <div
          className={cn(
            'absolute top-9 z-50 w-max min-w-[220px] max-w-[280px] rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-lg shadow-black/10',
            variant === 'sidebar' ? 'start-0' : 'inset-x-0 w-auto max-w-none',
          )}
        >
          <p className="mb-2 text-[11px] font-medium text-zinc-500">قیمت‌ها</p>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 text-zinc-600">
                  {faNumber(item.value)} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
