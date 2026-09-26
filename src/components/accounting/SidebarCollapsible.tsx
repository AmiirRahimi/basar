'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/ui';

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

export function SidebarReveal({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 transition-[grid-template-columns,opacity]',
        EASE,
        show ? 'grid-cols-[minmax(0,1fr)] opacity-100' : 'grid-cols-[0fr] opacity-0',
        className,
      )}
    >
      <div className="min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

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
  expanded = true,
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
  expanded?: boolean;
}) {
  const panelId = useId();
  const shown = Boolean(expanded) && !disabled && open;
  const panel = (
    <div
      id={panelId}
      className={cn(
        'grid transition-[grid-template-rows,opacity]',
        EASE,
        shown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-1 pb-1 pt-0.5">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl">
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
          'flex w-full items-center rounded-xl py-1.5 text-right text-white transition',
          expanded ? 'gap-2 px-2' : 'justify-center px-0',
          'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          shown && 'bg-white/[0.06]',
          'disabled:cursor-default disabled:hover:bg-transparent',
        )}
      >
        {leading}
        <SidebarReveal show={expanded} className="flex-1">
          <span className="block text-[10px] tracking-wide text-white/45">{label}</span>
          <span className="block truncate text-[13px] font-medium leading-5">{subtitle || 'انتخاب کنید'}</span>
        </SidebarReveal>
        {trailing}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-white/45 transition-all',
            EASE,
            shown && 'rotate-180',
            !expanded && 'w-0 opacity-0',
          )}
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
        active ? 'bg-white/12 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white',
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
