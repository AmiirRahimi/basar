'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const modalStyles = {
  root: 'fixed inset-0 z-modal overflow-y-auto overflow-x-hidden custom-scrollbar',
  area: 'flex min-h-screen flex-col items-center justify-center',
  overlay:
    'fixed inset-0 z-10 cursor-pointer bg-black/60 dark:bg-black/80 transition-opacity duration-300 ease-out data-[closed]:opacity-0',
  panel:
    'z-20 m-auto w-full break-words bg-background shadow-xl transition-all duration-300 ease-out data-[closed]:translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0',
  size: {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-[60%]',
    full: 'max-w-full min-h-screen',
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
      <div className={cn(modalStyles.area, size !== 'full' && [!noGutter && 'p-4 sm:p-5'])}>
        <DialogBackdrop transition className={cn(modalStyles.overlay, overlayClassName)} />
        <DialogPanel
          transition
          className={cn(
            modalStyles.panel,
            size !== 'full' && modalStyles.rounded[rounded],
            !customSize && customSize !== 0 && modalStyles.size[size],
            containerClassName
          )}
          {...((customSize || customSize === 0) && {
            style: {
              maxWidth: `${customSize}px`,
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
