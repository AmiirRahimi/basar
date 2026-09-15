import type { FC, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type InfoRowProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/**
 * Pure detail row — host app resolves/normalizes `value` before passing it in.
 */
export const InfoRow: FC<InfoRowProps> = ({ label, value, icon, className }) => (
  <div
    className={cn(
      'group flex items-start gap-3 rounded-xl border border-gray-100/80 bg-gradient-to-r from-gray-50/60 to-white/40 p-4 transition-all duration-200 hover:border-gray-200 hover:shadow-md hover:shadow-gray-100/50 dark:border-gray-800/80 dark:from-gray-800/30 dark:to-gray-900/20 dark:hover:border-gray-700 dark:hover:shadow-black/20',
      className
    )}
  >
    {icon != null && (
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
        {icon}
      </div>
    )}
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="break-all text-sm font-semibold text-gray-800 dark:text-gray-200">
        {value}
      </span>
    </div>
  </div>
);

export default InfoRow;
