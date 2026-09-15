import type { FC, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SectionCardProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  /** When true (default), omit outer card chrome so a parent owns the border. */
  flush?: boolean;
};

export const SectionCard: FC<SectionCardProps> = ({
  title,
  children,
  className,
  flush = true,
}) => (
  <div
    className={cn(
      'overflow-hidden',
      !flush &&
        'rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/60 dark:bg-gray-900 dark:shadow-none',
      className
    )}
  >
    <div className="relative border-b border-gray-100 dark:border-gray-800">
      <div className={cn('flex items-center gap-3', flush ? 'pb-4' : 'px-5 py-4 sm:px-6')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
          {title}
        </h3>
      </div>
    </div>
    <div className={cn(flush ? 'pt-5' : 'p-4 sm:p-6')}>{children}</div>
  </div>
);

export default SectionCard;
