'use client';

import hotToast, { Toaster as HotToaster, type ToastOptions as HotToastOptions } from 'react-hot-toast';
import { cn } from '../lib/cn';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type ToastOptions = HotToastOptions;

export type ToasterProps = {
  position?: ToastPosition;
  reverseOrder?: boolean;
  className?: string;
};

const baseClass =
  'rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-gray-900/10 dark:shadow-black/30';

/**
 * Mount once in the app root (layout). Styled for TelC brand.
 */
export function Toaster({
  position = 'top-center',
  reverseOrder = false,
  className,
}: ToasterProps) {
  return (
    <HotToaster
      position={position}
      reverseOrder={reverseOrder}
      containerClassName={cn('!z-[99999]', className)}
      containerStyle={{ zIndex: 99999 }}
      toastOptions={{
        className: cn(baseClass, 'bg-white text-gray-800 border-gray-200/80 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700/60'),
        style: { zIndex: 99999 },
        success: {
          className: cn(
            baseClass,
            'bg-white text-gray-800 border-green-200 dark:bg-gray-900 dark:text-gray-100 dark:border-green-800/50'
          ),
          iconTheme: {
            primary: 'rgb(17 168 73)',
            secondary: '#fff',
          },
        },
        error: {
          className: cn(
            baseClass,
            'bg-white text-gray-800 border-red-200 dark:bg-gray-900 dark:text-gray-100 dark:border-red-800/50'
          ),
          iconTheme: {
            primary: 'rgb(200 55 55)',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}

/**
 * Imperative toast API — prefer this over importing `react-hot-toast` directly.
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => hotToast.success(message, options),
  error: (message: string, options?: ToastOptions) => hotToast.error(message, options),
  info: (message: string, options?: ToastOptions) =>
    hotToast(message, { icon: 'ℹ️', ...options }),
  warning: (message: string, options?: ToastOptions) =>
    hotToast(message, { icon: '⚠️', ...options }),
  loading: (message: string, options?: ToastOptions) => hotToast.loading(message, options),
  dismiss: (id?: string) => hotToast.dismiss(id),
  custom: hotToast,
};

/** Mount once in the app root layout. */
export function AppToaster({
  position = 'top-center',
  reverseOrder = false,
  className,
}: ToasterProps = {}) {
  return <Toaster position={position} reverseOrder={reverseOrder} className={className} />;
}
