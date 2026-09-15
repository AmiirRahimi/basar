'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '../lib/cn';

export type LanguageOption = {
  code: string;
  label: string;
  /** Short badge text, e.g. EN / FA */
  badge?: string;
  badgeClassName?: string;
};

export type LanguageSwitcherProps = {
  value: string;
  onChange: (code: string) => void;
  options?: LanguageOption[];
  className?: string;
  /** Accessible name for the trigger */
  ariaLabel?: string;
  placement?: 'bottom-end' | 'bottom-start';
};

const DEFAULT_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    badge: 'EN',
    badgeClassName: 'bg-gradient-to-br from-blue-500 to-blue-600',
  },
  {
    code: 'fa',
    label: 'فارسی',
    badge: 'FA',
    badgeClassName: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  },
];

/**
 * Pure language switcher — pass `value` / `onChange` from the host app.
 * No i18n provider inside this package.
 */
export function LanguageSwitcher({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className,
  ariaLabel = 'Language',
  placement = 'bottom-end',
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/60 bg-white/80 text-gray-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-gray-300 hover:bg-white hover:text-gray-700 hover:shadow-md dark:border-gray-700/40 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/[0.08] dark:hover:text-gray-200"
      >
        <Globe className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-popover mt-2 min-w-[10.5rem] rounded-2xl border border-gray-200/80 bg-white/95 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95 dark:shadow-black/40',
            placement === 'bottom-end' ? 'end-0' : 'start-0'
          )}
        >
          <div className="flex flex-col gap-1 p-1">
            {options.map((opt) => {
              const active = value === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    onChange(opt.code);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary-default)/0.15)]'
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm',
                      opt.badgeClassName || 'bg-gradient-to-br from-gray-500 to-gray-700'
                    )}
                  >
                    {opt.badge || opt.code.slice(0, 2).toUpperCase()}
                  </span>
                  <span>{opt.label}</span>
                  {active && (
                    <span className="ms-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgb(var(--primary-default)/0.28)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
