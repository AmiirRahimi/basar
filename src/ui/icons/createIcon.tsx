import { forwardRef, type ReactNode, type SVGProps } from 'react';
import { cn } from '../lib/cn';

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  title?: string;
};

type CreateIconOptions = {
  viewBox?: string;
  fill?: string;
  stroke?: string;
};

export function createIcon(
  displayName: string,
  children: ReactNode,
  options: CreateIconOptions = {}
) {
  const { viewBox = '0 0 24 24', fill = 'none', stroke = 'currentColor' } = options;

  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size, title, className, strokeWidth = 1.5, ...props },
    ref
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke === 'none' ? undefined : strokeWidth}
        width={size}
        height={size}
        className={cn(!size && 'h-6 w-6', 'shrink-0', className)}
        aria-hidden={title ? undefined : true}
        {...props}
      >
        {title ? <title>{title}</title> : null}
        {children}
      </svg>
    );
  });

  Icon.displayName = displayName;
  return Icon;
}
