'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '../lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-popover w-72 rounded-xl border border-gray-200/80 bg-white p-4 text-foreground shadow-lg outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-gray-100',
        'origin-[--radix-popover-content-transform-origin] transition-[opacity,transform] duration-200 ease-out',
        'data-[state=open]:translate-y-0 data-[state=open]:scale-100 data-[state=open]:opacity-100',
        'data-[state=closed]:translate-y-1 data-[state=closed]:scale-95 data-[state=closed]:opacity-0',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));

PopoverContent.displayName = PopoverPrimitive.Content.displayName;
