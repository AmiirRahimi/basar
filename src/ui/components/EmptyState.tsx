'use client';

import type { ReactNode } from 'react';
import { Folder } from 'lucide-react';

export type EmptyStateProps = {
  icon?: ReactNode;
  /** Already-translated message from the host app. */
  message?: ReactNode;
};

export function EmptyState({
  icon,
  message = 'No items to display',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
        {icon || <Folder className="h-7 w-7 text-gray-300 dark:text-gray-600" />}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export default EmptyState;
