'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ExternalLink, Grid3X3 } from 'lucide-react';
import { cn } from '../lib/cn';

export type AppSwitcherItem = {
  id: string;
  name: ReactNode;
  description?: ReactNode;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
};

export type AppSwitcherProps = {
  apps: AppSwitcherItem[];
  label?: string;
  title?: ReactNode;
  currentLabel?: ReactNode;
  className?: string;
  buttonClassName?: string;
  onNavigate?: (app: AppSwitcherItem) => void;
};

export function AppSwitcher({
  apps,
  label = 'Switch application',
  title = 'Applications',
  currentLabel = 'Current',
  className,
  buttonClassName,
  onNavigate,
}: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/70',
          'bg-white/85 text-gray-500 shadow-sm backdrop-blur-md transition-all duration-200',
          'hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          'dark:border-gray-700/60 dark:bg-white/[0.05] dark:text-gray-300',
          'dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary',
          open && 'border-primary/40 bg-primary/10 text-primary',
          buttonClassName
        )}
      >
        <Grid3X3 className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute end-0 top-full z-popover mt-2 w-[min(22rem,calc(100vw-2rem))]',
            'rounded-2xl border border-gray-200/80 bg-white/95 p-2 shadow-2xl shadow-gray-900/15 backdrop-blur-xl',
            'dark:border-gray-700/70 dark:bg-gray-900/95 dark:shadow-black/40'
          )}
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {title}
            </p>
          </div>

          <div className="grid gap-1">
            {apps.map(app => {
              const unavailable = app.disabled || !app.href;
              const content = (
                <>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      app.active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {app.icon ?? <Grid3X3 className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {app.name}
                      </span>
                      {app.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Check className="h-3 w-3" />
                          {currentLabel}
                        </span>
                      ) : null}
                    </span>
                    {app.description ? (
                      <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                        {app.description}
                      </span>
                    ) : null}
                  </span>
                  {!app.active && !unavailable ? (
                    <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : null}
                </>
              );

              const itemClassName = cn(
                'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors',
                app.active
                  ? 'bg-primary/5'
                  : 'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
                unavailable && 'cursor-not-allowed opacity-45'
              );

              if (app.active || unavailable) {
                return (
                  <div key={app.id} role="menuitem" aria-current={app.active ? 'page' : undefined} className={itemClassName}>
                    {content}
                  </div>
                );
              }

              return (
                <a
                  key={app.id}
                  role="menuitem"
                  href={app.href}
                  className={itemClassName}
                  onClick={() => {
                    onNavigate?.(app);
                    setOpen(false);
                  }}
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AppSwitcher;
