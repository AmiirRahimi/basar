'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const modalStyles = {
  root: 'fixed inset-0 z-modal overflow-y-auto overflow-x-hidden custom-scrollbar',
  area: 'flex min-h-dvh w-full max-w-[100vw] flex-col items-center justify-center',
  overlay:
    'fixed inset-0 z-10 cursor-pointer bg-black/60 dark:bg-black/80 transition-opacity duration-300 ease-out data-[closed]:opacity-0',
  panel:
    'z-20 mx-auto flex w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-auto break-words bg-background shadow-xl transition-all duration-300 ease-out data-[closed]:translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0',
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
}: ModalProps) {
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
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

Modal.displayName = 'Modal';
