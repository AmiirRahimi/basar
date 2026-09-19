'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/ui';

export function SidebarCollapsible({
  label,
  subtitle,
  leading,
  open,
  onOpenChange,
  disabled,
  trailing,
  children,
  expand = 'down',
}: {
  label: string;
  subtitle?: string;
  leading?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
  expand?: 'down' | 'up';
}) {
  const panelId = useId();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (disabled) setHovered(false);
  }, [disabled]);

  const shown = !disabled && (open || hovered);
  const panel = (
    <div
      id={panelId}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        shown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-1 pb-1 pt-0.5">{children}</div>
      </div>
    </div>
  );

  return (
    <div
      className="rounded-xl"
      onMouseEnter={() => {
        if (!disabled) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {expand === 'up' ? panel : null}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={shown}
        aria-controls={panelId}
        onClick={() => {
          if (!disabled) onOpenChange(!open);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-right text-white transition',
          'hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          shown && 'bg-white/[0.08]',
          'disabled:cursor-default disabled:hover:bg-transparent',
        )}
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] leading-4 text-white/45">{label}</span>
          <span className="block truncate text-[13px] font-medium leading-5">{subtitle || 'انتخاب کنید'}</span>
        </span>
        {trailing}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-white/45 transition-transform duration-300', shown && 'rotate-180')}
        />
      </button>
      {expand === 'down' ? panel : null}
    </div>
  );
}

export function SidebarCollapseItem({
  active,
  onClick,
  leading,
  label,
  hint,
  trailing,
}: {
  active?: boolean;
  onClick: () => void;
  leading?: ReactNode;
  label: string;
  hint?: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-right text-sm transition',
        active ? 'bg-white/14 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-white/40">{hint}</span> : null}
      </span>
      {trailing}
    </button>
  );
}
