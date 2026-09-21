import { BRAND_LOGO } from '@/lib/brand-logo';
import { cn } from '@/ui/lib/cn';

const SRC = {
  full: BRAND_LOGO.full,
  wide: BRAND_LOGO.wide,
  mark: BRAND_LOGO.mark,
} as const;

export function BrandLogo({
  variant = 'full',
  className,
  alt = 'باسار',
  priority = false,
}: {
  variant?: keyof typeof SRC;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[variant]}
      alt={alt}
      dir="ltr"
      className={cn('select-none object-contain', className)}
      {...(priority ? { fetchPriority: 'high' as const } : {})}
    />
  );
}
