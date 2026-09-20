'use client';

import type { ReactNode } from 'react';
import { Tooltip } from 'rizzui';

export type HintPopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export type HintPopoverProps = {
  content?: ReactNode;
  children: ReactNode;
  placement?: HintPopoverPlacement;
  className?: string;
};

/** Shared hover hint used across table actions, form sections, and overflow text. */
export function HintPopover({
  content,
  children,
  placement = 'top',
  className,
}: HintPopoverProps) {
  if (content == null || content === false || content === '') {
    return <>{children}</>;
  }

  return (
    <Tooltip size="sm" content={content} placement={placement} color="invert" className={className}>
      {children}
    </Tooltip>
  );
}

export default HintPopover;
