'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type StickyHeaderProps = {
  offset?: number;
  className?: string;
  children?: ReactNode;
};

export function StickyHeader({ offset = 2, className, children }: StickyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);

  return (
    <header
      className={cn(
        'relative z-header flex items-center p-4 backdrop-blur-xl transition-shadow duration-300',
        'rounded-xl border border-gray-200/70 dark:border-gray-800/60',
        'bg-header-gradient',
        'shadow-sm',
        'justify-between px-4 md:px-5 py-2.5 transition-all duration-300',
        scrolled
          ? 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]'
          : '',
        className
      )}
    >
      {children}
    </header>
  );
}

export default StickyHeader;
