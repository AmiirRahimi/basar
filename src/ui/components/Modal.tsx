'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconButton } from './Button';

const modalStyles = {
  root: 'fixed inset-0 z-modal overflow-y-auto overflow-x-hidden custom-scrollbar',
  area: 'flex min-h-dvh w-full max-w-[100vw] flex-col items-center justify-center',
  overlay:
    'fixed inset-0 z-10 cursor-pointer bg-black/60 dark:bg-black/80 transition-opacity duration-300 ease-out data-[closed]:opacity-0',
  panel:
    'z-20 mx-auto flex w-full min-w-0 max-w-full flex-col overflow-hidden break-words bg-background shadow-xl transition-all duration-300 ease-out data-[closed]:translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0',
  size: {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full min-h-dvh',
  },
  rounded: {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  },
} as const;

export type ModalSize = keyof typeof modalStyles.size;
export type ModalRounded = keyof typeof modalStyles.rounded;

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  noGutter?: boolean;
  className?: string;
  size?: ModalSize;
  rounded?: ModalRounded;
  customSize?: number;
  overlayClassName?: string;
  containerClassName?: string;
  title?: ReactNode;
  closeLabel?: string;
  hideCloseButton?: boolean;
};

export function Modal({
  isOpen,
  onClose,
  children,
  noGutter,
  className,
  size = 'md',
  rounded = 'md',
  customSize,
  overlayClassName,
  containerClassName,
  title,
  closeLabel = 'بستن',
  hideCloseButton = false,
}: ModalProps) {
  const showHeader = Boolean(title) || !hideCloseButton;
  return (
    <Dialog open={isOpen} onClose={onClose} className={cn(modalStyles.root, className)}>
      <div className={cn(modalStyles.area, size !== 'full' && [!noGutter && 'p-3 sm:p-5'])}>
        <DialogBackdrop transition className={cn(modalStyles.overlay, overlayClassName)} />
        <DialogPanel
          transition
          className={cn(
            modalStyles.panel,
            size !== 'full' && 'max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)]',
            size !== 'full' && modalStyles.rounded[rounded],
            !customSize && customSize !== 0 && modalStyles.size[size],
            containerClassName
          )}
          {...((customSize || customSize === 0) && {
            style: {
              maxWidth: `min(${customSize}px, calc(100vw - 1.5rem))`,
            },
          })}
        >
          {showHeader ? (
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              {title ? (
                <DialogTitle className="min-w-0 flex-1 text-start text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </DialogTitle>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
              {hideCloseButton ? null : (
                <IconButton type="button" size="sm" variant="ghost" aria-label={closeLabel} onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          ) : null}
          <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

Modal.displayName = 'Modal';
