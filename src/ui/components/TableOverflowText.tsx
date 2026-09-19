'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'rizzui';
import { cn } from '../lib/cn';

export function TableOverflowText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [text, setText] = useState('');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
      setText((el.textContent || '').replace(/\s+/g, ' ').trim());
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  const content = (
    <div ref={ref} className={cn('min-w-0 truncate', className)}>
      {children}
    </div>
  );

  if (!overflowing || !text) return content;

  return (
    <Tooltip
      size="sm"
      content={<span className="inline-block max-w-xs whitespace-pre-wrap break-words text-right">{text}</span>}
      placement="top"
      color="invert"
    >
      {content}
    </Tooltip>
  );
}
